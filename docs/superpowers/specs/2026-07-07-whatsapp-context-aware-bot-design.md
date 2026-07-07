# WhatsApp Context-Aware Bot — Design

Date: 2026-07-07
Status: Approved

## Goals

The WhatsApp bot (`backend/`) currently only accepts `text` messages, only recognizes
literal "ya"/"tidak" (plus AI-detected revisions) while awaiting report confirmation, and
has no memory of prior conversation turns — each message is handled with only the current
pending report (`Session`) as context. This design adds:

1. Acceptance of any WhatsApp message type, with a friendly fallback for non-text types.
2. A three-way intent classification while awaiting confirmation (revision / question /
   indirect cancellation), instead of the current binary revision/chat split.
3. General-purpose Q&A that isn't restricted to farm topics.
4. Short-term conversation memory: the bot uses the last 10 messages per phone number as
   context for every AI call, so it can resolve references like "yang tadi" or "itu" and
   answer more naturally even when the user doesn't restate context explicitly.

## Non-goals

- Processing the *content* of non-text messages (no audio transcription, no image OCR).
  Non-text messages get a fixed fallback reply only.
- Long-term memory beyond 30 days, or cross-device/cross-number identity resolution.
- Any frontend changes.

## Data model

New table, following the same pattern as the existing `Session` table:

```prisma
model ChatMessage {
  id        String   @id @default(uuid())
  phone     String
  role      String   // "user" | "bot"
  content   String
  createdAt DateTime @default(now())

  @@index([phone, createdAt])
  @@map("chat_message")
}
```

- `role` distinguishes inbound (`user`) vs outbound (`bot`) messages so history can be
  formatted as a transcript.
- `content` stores plain text. For non-text inbound messages, a short tag like `[image]`,
  `[audio]`, `[document]`, `[location]` is stored instead of real content.
- Index on `(phone, createdAt)` supports the two access patterns: fetching the most recent
  N messages for a phone, and pruning old ones.

## New module: chat history

`backend/src/repositories/chat-message.repository.js`:
- `createMessage(phone, role, content)` — insert one row.
- `getRecentMessages(phone, limit)` — last `limit` rows for a phone, ordered oldest→newest
  (so it reads naturally as a transcript when formatted).
- `deleteOldMessages(phone, olderThanDays)` — delete rows for a phone older than the cutoff.

`backend/src/services/chat-history.service.js`:
- `buildHistoryContext(phone)` — fetches the last 10 messages via the repository and
  formats them into a compact transcript block:

  ```
  [Riwayat percakapan terakhir]
  User: kambing nomor 12 udah kawin tanggal 3
  Bot: Boleh minta nomor telinga/ID kambingnya, Pak/Bu?
  User: itu nomor 12
  ```

  Returns `''` if there's no history yet (so prompts don't need to special-case it).
- `logTurn(phone, userMessage, botReply)` — convenience wrapper that calls
  `createMessage` twice (user then bot) and is called once per `handleMessage` invocation
  in `recording.service.js`, right after `sendTextMessage`.
- `pruneHistory(phone)` — calls `deleteOldMessages(phone, 30)`, wrapped in
  `.catch(() => {})` so a cleanup failure never blocks the reply pipeline. Called as a
  fire-and-forget call (not awaited) at the top of `handleMessage`, matching the existing
  non-blocking `verifySheetsConsistency()` pattern in `recording.service.js`.

Failure handling: if `buildHistoryContext` throws (DB error), catch it, log a warning, and
proceed with an empty history string rather than failing the whole request.

## Webhook: accept any message type

`backend/src/controllers/webhook.controller.js`:
- Keep the existing early-return when there is no message at all.
- Remove the `message.type !== 'text'` early-return.
- Branch on `message.type`:
  - `'text'` → existing flow: `handleMessage(messageText, senderPhone, senderName)`.
  - anything else → `handleUnsupportedMessage(message.type, senderPhone, senderName)` (new
    export from `recording.service.js`), which:
    - Logs the inbound message to `ChatMessage` with a tag like `[image]`.
    - Sends a fixed, type-aware fallback reply (see below) via `sendTextMessage` — no
      Gemini call.
    - Logs the outbound fallback reply to `ChatMessage`.
    - Returns `{ state: 'unsupported_message_type', type }` for the controller's log line.

Fallback replies (plain lookup, in `recording.service.js`):
- `image`, `sticker`, `video` → "Maaf, saya baru bisa membaca pesan teks, Pak/Bu 🙏 Boleh diketik ulang laporannya?"
- `audio` → "Maaf, saya belum bisa mendengarkan pesan suara, Pak/Bu 🙏 Boleh diketik saja laporannya?"
- `document`, `location`, `contacts`, anything else → "Maaf, saya baru bisa membaca pesan teks, Pak/Bu 🙏"

## Confirmation-state intent classification

Replace `classifyMessageInConfirmation`'s binary `{ isRevisi }` result with a three-way
classification, using history context:

```
{ intent: 'REVISI', parsed }         // same handling as today: replace pending data
{ intent: 'PEMBATALAN' }             // treat like the existing isKonfirmasiTidak branch
{ intent: 'PERTANYAAN' }             // answer via generateChatReply (with history), then
                                      // remind the user to reply ya/tidak, as today
```

`PEMBATALAN` catches indirect cancellations/postponements that the `KONFIRMASI_NEGATIF`
regex misses (e.g. "nanti aja", "gajadi", "batal aja deh") — these currently fall through
to a generic chat reply that ignores the user's actual intent. The prompt for this
classifier includes the history context block so intent can be judged in light of the
ongoing conversation, not just the single message.

## AI calls gain history context

All four `gemini.service.js` functions take an additional `historyContext` string
parameter (built once per `handleMessage` call via `buildHistoryContext`, passed down),
prepended to their existing prompts:

- `parseMessage(messageText, senderName, historyContext)`
- `classifyMessageInConfirmation(messageText, senderName, existingData, historyContext)`
  (also updated for the three-way intent above)
- `generateChatReply(messageText, senderName, context, historyContext)` — `context` (the
  existing optional "user still has a pending report" hint) and `historyContext` are both
  included, kept as separate parameters since they serve different purposes.
- `generateDataAnswer(messageText, dbDataJson, senderName, historyContext)`

`generateChatReply`'s prompt is also loosened: it no longer needs to restrict itself to
livestock topics — general questions should get a real answer, not a redirect, per the
existing "peternak assistant" persona but without a farm-only restriction.

## `recording.service.js` changes

- At the top of `handleMessage`: fire-and-forget `pruneHistory(senderPhone)`, then
  `const historyContext = await buildHistoryContext(senderPhone).catch(() => '')`.
- Thread `historyContext` through to every Gemini call site.
- After every `sendTextMessage(...)` call in the function, also call
  `logTurn(senderPhone, messageText, reply)` (fire-and-forget, `.catch()`'d) so history
  capture never blocks or fails the response to WhatsApp.
- Add `handleUnsupportedMessage` export as described above.
- Update `classifyMessageInConfirmation` call site to branch on the new `intent` field
  (`REVISI` / `PEMBATALAN` / `PERTANYAAN`) instead of the old `isRevisi` boolean.

## Testing plan

No automated test suite exists in this repo to extend. Manual verification via the
WhatsApp sandbox (ngrok), covering:

1. Existing text report flow (parse → ask nomor telinga → confirm → save) still works
   unchanged.
2. Sending an image/sticker/audio/location message gets the correct type-aware fallback
   reply, and doesn't throw.
3. While `awaiting_confirmation`, replying with an indirect cancellation ("gajadi deh")
   cancels the session instead of getting a generic chat reply.
4. While `awaiting_confirmation`, asking an unrelated question gets answered and the user
   is reminded to reply ya/tidak.
5. A multi-turn conversation where a later message references an earlier one (e.g. "itu
   yang nomor 12 tadi") gets a contextually correct reply, demonstrating history is being
   used.
6. After 30+ days (or by manually backdating `createdAt` in the DB for a test row),
   confirm `pruneHistory` deletes the old row on the next incoming message from that phone.

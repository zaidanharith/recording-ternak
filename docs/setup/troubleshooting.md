# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Gemini error: quota exceeded / model not found | Using a retired model name (`gemini-1.5-flash`) or a region-restricted one (`gemini-2.0-flash`) | Confirm `backend/src/config/index.js` still points `gemini.model`/`gemini.chatModel` at currently-supported models (`gemini-2.5-flash`, `gemini-2.5-flash-lite`) |
| Sheets error: "The caller does not have permission" | The service account behind `GOOGLE_CREDENTIALS` / `google-credentials.json` was never granted access to the spreadsheet | Open the spreadsheet → Share → add the service account's `client_email` as **Editor** |
| WhatsApp send fails with "Object with ID does not exist" | `WA_PHONE_NUMBER_ID` is set to the WhatsApp Business Account ID instead of the Phone Number ID | Use the **Phone Number ID** from Meta Developer Console → WhatsApp → API Setup |
| Webhook verification fails (`403`) in Meta's dashboard | `WA_VERIFY_TOKEN` in `.env`/Vercel doesn't match what was typed into Meta's Callback URL setup form | Make them identical, then re-click Verify and Save |
| Farmer never gets a reply, no error logged | Webhook payload didn't reach the backend at all | Check ngrok/Vercel logs; confirm the webhook is subscribed to the `messages` field in Meta's Webhook Fields settings |
| DB and Google Sheets show different row counts | A `runFullSync` was interrupted, or writes happened directly in Sheets (which the app doesn't read back) | `POST /api/sync/retry` (or wait for the automatic consistency check after the next saved report) — see [`api/sync.md`](../api/sync.md). Treat Sheets as read-only for stakeholders; never edit it by hand |
| `401` from the dashboard right after deploying a new `JWT_SECRET` | Existing tokens were signed with the old secret | All logged-in admins must log in again |
| Farmer's report seems to disappear / "no active session" mid-conversation | Session TTL (10 minutes, `session.service.js`) expired between messages | Expected behavior — the farmer needs to resend the report; TTL is intentionally short to avoid stale confirmations |
| Photo upload succeeds but the recording never gets a `photoUrl` | The photo was sent as a separate WhatsApp message *before* the caption/report text, but the report text was sent so late the session had already advanced past `awaiting_confirmation`/`awaiting_nomor_telinga` | `handleImageMessage` only carries a bare photo forward while the session is in `saved`, `awaiting_confirmation`, or `awaiting_nomor_telinga`; outside those states the photo is not attached anywhere |

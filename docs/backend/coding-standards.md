# Backend Coding Standards

## Layering

`routes/*.route.js` → `controllers/*.controller.js` → `services/*.service.js` and/or `repositories/*.repository.js`.

- **Controllers** parse/validate `req.body`/`req.query`/`req.params`, call one or more services/repositories, and shape the HTTP response. They never call `prisma` directly.
- **Repositories** are the only files that import `../lib/prisma` — one file per Prisma model family (`admin.repository.js`, `farmer.repository.js`, `goat.repository.js`, `recording.repository.js`, `chat-message.repository.js`, `sync-status.repository.js`).
- **Services** hold business logic and third-party integrations (Gemini, WhatsApp Cloud API, Cloudinary, Google Sheets) with no Express `req`/`res` awareness — they take plain arguments and return plain values, so they're reusable from both the webhook flow and (if needed) scripts/tests.

## Controller response pattern

Every controller action follows the same shape (see [`api/error-response.md`](../api/error-response.md) for the full contract):

```js
exports.someAction = async (req, res) => {
  try {
    // validate input, return 400 early if invalid
    // call repository/service
    return res.status(200).json({ success: true, data: { ... } });
  } catch (error) {
    console.error('Some Action Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat ...',
      error: error.message,
    });
  }
};
```

User-facing `message` strings are Indonesian; `console.error` labels are English-prefixed with an emoji or a short tag (`'List Farmers Error:'`) for quick log scanning.

## Naming

- Prisma model fields are camelCase; database columns are snake_case via `@map`/`@@map` — always go through Prisma, never raw SQL, so this mapping is transparent.
- WhatsApp-flow code (`recording.service.js`, `gemini.service.js`, `query.service.js`) uses Indonesian variable/field names (`nomorTelinga`, `parsed.tanggal_kawin`) matching the domain vocabulary farmers use and the `aiParseFields` keys in `config/index.js`, since these are directly serialized into/out of Gemini prompts. Dashboard-facing REST code (`recording.repository.js`'s `createManualRecording`, controllers) uses English field names matching the Prisma schema. Don't mix the two within one function — translate at the boundary (see `recording.repository.js#createRecording` vs `#createManualRecording`).

## Central configuration

`backend/src/config/index.js` is the single place for: Gemini model names, Google Sheets column/label definitions (`dataSchema.recording`/`kambing`/`peternak`), the AI extraction field list (`dataSchema.aiParseFields`), and env var wiring. When adding a new farmer-reportable field, extend `dataSchema.aiParseFields` (for Gemini extraction), `dataSchema.recording` (for the Sheets column), and the Prisma schema — all three, or the field silently won't reach one of the three destinations (DB, Sheets, AI prompt).

## Errors from Prisma

Controllers catch Prisma's `PrismaClientKnownRequestError` codes (`P2002` unique violation, `P2003` FK violation, `P2025` not found) inline via `error.code` rather than a shared error-mapping middleware — see [`api/error-response.md`](../api/error-response.md#prisma-error-code-mapping) for the mapping table. Keep new mutating endpoints consistent with this per-controller `try/catch` pattern rather than introducing a new global error handler.

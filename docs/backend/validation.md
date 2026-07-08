# Validation

There is no schema-validation library (no Zod/Joi) on the backend — validation is manual, inline at the top of each controller action, following a consistent shape:

```js
if (!name || !whatsappPhone) {
  return res.status(400).json({
    success: false,
    message: 'name dan whatsappPhone wajib diisi.',
  });
}
```

## Patterns used across controllers

- **Required fields** — explicit falsy checks (`!field`), one `400` per action with an Indonesian message naming the missing fields.
- **Enum fields** — checked against a local constant array before touching the DB, e.g. `ASSIGNABLE_ROLES = ['ADMIN', 'VIEWER']` in `admin.controller.js`, `RECORDING_STATUSES = ['PERLU_REVIEW', 'FINAL']` in `recording.controller.js`.
- **Partial update "nothing changed" guard** — `PATCH` handlers build an `updateData` object field-by-field from `req.body`, then return `400` ("Tidak ada data yang diubah.") if `Object.keys(updateData).length === 0`, to avoid a no-op Prisma call.
- **File upload validation** — handled by `multer`'s `fileFilter`/`limits` in `middlewares/upload.middleware.js` (MIME type allow-list, 5MB size cap), not in the controller. Errors surface via multer's callback form, caught in the route (`uploads.route.js`, `runUpload`), not a global Express error handler.
- **Cross-entity existence checks** — deferred to the database via Prisma's foreign-key constraint (`P2003`) rather than a pre-flight `findUnique` call, e.g. creating a goat with a non-existent `farmerId` fails at the DB layer and is translated to `400` in the catch block.

## WhatsApp-side validation

Farmer-submitted data isn't validated in the traditional sense — Gemini is instructed (via prompt rules in `gemini.service.js`) to fill unspecified fields with `"-"` rather than guessing, and dates are normalized to `DD/MM/YYYY`. There's no rejection of malformed input from the farmer's side; the bot instead asks a follow-up question when a required field (ear tag number) is missing, via the `awaiting_nomor_telinga` session state (see [`architecture/system-design.md`](../architecture/system-design.md#conversation-state-machine)). Photo validation (MIME type, 5MB) is re-checked manually in `recording.service.js#handleImageMessage` since WhatsApp media downloads bypass multer entirely.

## Frontend validation

`react-hook-form` + `zod` schemas in `frontend/src/lib/validation.ts`, resolved via `@hookform/resolvers/zod` — see [`frontend/components.md`](../frontend/components.md#forms).

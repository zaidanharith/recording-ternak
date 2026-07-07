# Cloudinary Photo Storage for Recordings — Design

Date: 2026-07-07
Status: Approved

## Problem

`Recording.photoUrl` exists in the schema but there is no actual upload pipeline:

- WhatsApp image messages are currently routed to `handleUnsupportedMessage` and dropped entirely.
- The admin dashboard's create/update recording endpoints accept `photoUrl` as a raw string — the client is expected to already have a hosted URL, which isn't true today.

This feature wires up real photo upload/storage via Cloudinary for both entry points.

## Scope

- Backend only (`backend/`). Frontend wiring to call the new upload endpoint is out of scope.
- Two upload sources: WhatsApp image messages (with or without caption) and a dedicated dashboard upload endpoint.
- Cloudinary account/credentials are already provisioned by the user; only `.env` wiring is needed.

## Architecture

### New components

- `src/services/cloudinary.service.js` — thin wrapper over the `cloudinary` SDK:
  - `uploadImage(buffer, folder)` → `{ url, publicId }`
  - `deleteImage(publicId)` → best-effort; logs and swallows errors, never throws (cleanup must not fail the primary request).
- `src/config/index.js` — new `cloudinary` block reading `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- New dependencies: `cloudinary` (official SDK), `multer` (memory storage, for the dashboard upload endpoint). Neither is currently installed.

### Schema change

Add to `Recording` in `prisma/schema.prisma`:

```prisma
photoPublicId String? @map("photo_public_id")
```

Storing the Cloudinary `public_id` explicitly (rather than deriving it from the URL later) is required to reliably call `destroy()` when a photo is replaced or a recording is deleted. Requires a new Prisma migration.

### Validation rules (shared by both upload sources)

- Allowed MIME types: `image/jpeg`, `image/png` only (matches what WhatsApp sends for photos).
- Max size: 5MB.
- Violations are rejected before any Cloudinary upload happens.

## Dashboard admin flow

- New route: `POST /api/uploads/photo`, mounted under `/api/uploads` in `src/routes/api.js`.
  - `authMiddleware` + `requireRole('ADMIN', 'SUPERADMIN')` — same protection level as recording create/update.
  - `multer` memory storage, single field `photo`, enforces the shared MIME/size validation via `fileFilter` + `limits`.
- `src/controllers/uploads.controller.js` — `uploadPhoto` handler uploads the buffer via `cloudinary.service.uploadImage(buffer, 'recording-ternak/dashboard')`, responds `{ success: true, data: { url, publicId } }`.
- `src/controllers/recording.controller.js`:
  - `createRecording` / `updateRecording` now also accept `photoPublicId` from the request body alongside the existing `photoUrl`.
  - `updateRecording`: if the incoming `photoUrl` differs from the existing record's `photoUrl` and the existing record has a `photoPublicId`, call `cloudinary.service.deleteImage(oldPublicId)` (best-effort, after the DB update succeeds) before/alongside saving the new values.
  - `deleteRecording`: fetch the recording first to get `photoPublicId`; after the DB delete succeeds, call `cloudinary.service.deleteImage(publicId)` best-effort (non-blocking to the response, errors only logged).
- `src/repositories/recording.repository.js`: `createManualRecording` and `updateRecording` extended to persist `photoPublicId` alongside `photoUrl`.

## WhatsApp flow

- `src/services/whatsapp.service.js` — two new functions:
  - `getMediaUrl(mediaId)` — `GET https://graph.facebook.com/v21.0/{mediaId}` with the existing Bearer token, returns `{ url, mimeType }`.
  - `downloadMedia(url)` — `GET` the returned URL with the same Bearer token, returns a `Buffer`.
- `src/controllers/webhook.controller.js` — `message.type === 'image'` is now handled explicitly instead of falling into `handleUnsupportedMessage`: extracts `mediaId = message.image.id` and `caption = message.image.caption || ''`, calls `handleImageMessage(mediaId, caption, senderPhone, senderName)`.
- `src/services/recording.service.js` — new `handleImageMessage`:
  1. Load the current session (no download yet).
  2. Compute `shouldProcess = caption.trim() !== '' || session?.state is 'awaiting_confirmation' or 'awaiting_nomor_telinga'`.
     - If `false`: reply asking the farmer to also send the report as text; **no download/upload happens** (avoids orphaned Cloudinary assets for photos that have nowhere to attach).
  3. If `shouldProcess`: download the media, validate MIME/size (reject with a friendly Indonesian error message on failure, no upload attempted). On success, upload to Cloudinary under `recording-ternak/whatsapp`, get `{ url, publicId }`.
  4. If caption is empty (photo attached to an already-pending session): merge `{ url, publicId }` into `session.data.photo`, keep the same session state, reply confirming the photo was attached to the pending report.
  5. If caption is non-empty: call `handleMessage(caption, senderPhone, senderName, photo)`.
- `handleMessage` in `recording.service.js` gains an optional 4th parameter `photo` (`{ url, publicId } | null`, default `null`):
  - Every place that calls `setSession(..., 'awaiting_nomor_telinga', ...)` or `setSession(..., 'awaiting_confirmation', ...)` includes `photo: photo || session?.data?.photo || null` in the session data, so a photo attached at any step survives subsequent text-only turns (nomor telinga follow-up, revisions, etc.) until the report is actually saved.
  - `saveReport` reads `pendingData.photo` and passes `photoUrl`/`photoPublicId` through to `createRecording` (repository).
- `src/repositories/recording.repository.js`: `createRecording` (the legacy WA-path function) extended to accept and persist `photoUrl` / `photoPublicId`.

## Error handling

- Cloudinary upload failures (network/API errors) during the WA flow: caught, farmer gets a generic "sistem sedang gangguan, coba lagi" reply consistent with existing error replies in `recording.service.js`; the report is not saved without a clear next step for the user (they can resend).
- Cloudinary upload failures during the dashboard flow: `uploads.controller.js` returns `500` with `{ success: false, message, error }`, consistent with other controllers' error shape.
- Cloudinary delete/cleanup failures (replace or delete recording): always best-effort — logged via `console.error`, never surfaced as a failed response, since the primary DB operation already succeeded.

## Testing

Per the project's testing conventions, this needs coverage added under the existing `__tests__` folders:

- `cloudinary.service`: mock the `cloudinary` SDK, test `uploadImage` / `deleteImage` success and failure paths.
- `uploads.controller`: mime/size rejection, successful upload response shape, auth/role gating.
- `recording.controller` / `recording.repository`: photo replace triggers old-asset cleanup; delete triggers cleanup; manual create persists `photoPublicId`.
- `recording.service.handleImageMessage`: no-caption + no-session (no upload attempted), no-caption + active session (merges into session), caption present (flows into `handleMessage` and eventually `saveReport`), validation rejection paths.
- `whatsapp.service`: `getMediaUrl` / `downloadMedia` request shape (mocked `fetch`).

## Out of scope

- Frontend changes to call `/api/uploads/photo` or render photos.
- Any UI for viewing/cropping/editing photos.
- Multiple photos per recording (schema stays single `photoUrl`/`photoPublicId`).

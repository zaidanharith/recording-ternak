# Uploads API

Base path: `/api/uploads`. Requires auth and role `ADMIN`/`SUPERADMIN`.

## `POST /api/uploads/photo`

Uploads a single image directly to Cloudinary (folder `recording-ternak/dashboard`) for use in manually-created recordings — see [`recordings.md`](recordings.md#post-apirecordings).

Request: `multipart/form-data`, field name `photo`. Constraints (`upload.middleware.js`): MIME type `image/jpeg` or `image/png` only, max size 5MB. Files are held in memory (`multer.memoryStorage()`) — never written to disk — before being streamed to Cloudinary.

Multer validation errors (wrong type, too large) are caught in the route itself and returned as `400` before reaching the controller — not via a global error-handling middleware.

Response `201`:
```json
{ "success": true, "data": { "url": "https://res.cloudinary.com/…/recording-ternak/dashboard/…jpg", "publicId": "recording-ternak/dashboard/…" } }
```

Response `400` if no file: `{ "success": false, "message": "File foto wajib diunggah." }`.

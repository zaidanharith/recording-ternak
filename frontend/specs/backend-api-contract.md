# Backend API Contract Reference (for frontend build)

Base URL: `${NEXT_PUBLIC_API_URL}/api` (backend has no `NEXT_PUBLIC_`-style var itself; frontend must set this). **No CORS middleware is configured in `backend/src/server.js`** — must add `cors` package server-side (or a Next.js rewrite/proxy) before the frontend can call it cross-origin. Flag this to the user.

Auth: `Authorization: Bearer <jwt>` header (not cookies). Token from login/google-login response, 7d expiry. No refresh endpoint exists.

All responses: `{ success: boolean, message?: string, data?: {...}, error?: string }`. Errors mostly `500` with `error: err.message`; specific codes noted below.

## Enums (Prisma)

- `Role`: `ADMIN | SUPERADMIN | VIEWER`
- `RecordingStatus`: `PERLU_REVIEW | FINAL`
- `RecordingSource`: `WA | MANUAL`
- Admin-assignable roles via `/api/admins` and `/api/auth/me` PATCH: only `ADMIN | VIEWER` (SUPERADMIN not assignable through API)

## Models (Prisma → JSON field names, camelCase, dates as ISO strings)

**Farmer** (`farmer` table): `id, name, address, whatsappPhone, createdAt, updatedAt, goats?[]`
**Goat** (`goat` table): `id, earTagNumber, farmerId, farmer?, createdAt, updatedAt, recordings?[]`
**Recording** (`recording` table): `id, goatId, goat?, senderName, matingDate, birthDate, maleKidCount, femaleKidCount, matingNumber, saleTarget, sold, notes, status, source, photoUrl, photoPublicId, createdAt`
  - NOTE: all data fields (matingDate, birthDate, maleKidCount, femaleKidCount, matingNumber, saleTarget, sold, notes) are **strings** (default `"-"`), not typed numbers/dates — free text from WA parsing. No `updatedAt` field on Recording.
**Admin** (`admin` table): `id, username, email, password(never returned—stripped), name, role, googleId, avatarUrl, createdAt, updatedAt`
**ChatMessage**: `id, phone, role, content, createdAt` (role here is chat role like "user"/"assistant", unrelated to Admin Role enum)
**SyncStatus**: `id: "singleton", lastSyncAt, lastStatus (default "BELUM_PERNAH"), lastError, updatedAt`

## Routes

### `/api/auth` (no base auth middleware)
- `POST /login` — body `{email, password}` → 200 `{data:{token, admin}}`; 400 missing fields; 401 wrong creds
- `POST /google` — body `{idToken}` → 200 `{data:{token, admin}}`; 400 no idToken/unverified email; 401 invalid token; 403 admin not pre-registered (only existing email/googleId can log in — no self-registration)
- `GET /me` — auth required → 200 `{data:{admin}}`; 404
- `PATCH /me` — auth required — body `{name?, avatarUrl?, currentPassword?, newPassword?}` → 200 `{data:{admin}}`; 400 if newPassword without currentPassword or wrong currentPassword

### `/api/admins` (all routes: auth + `requireRole('SUPERADMIN')`)
- `GET /` → `{data:{admins:[]}}`
- `POST /` — body `{username, email, password, name, role, avatarUrl?}`, role must be ADMIN|VIEWER → 201 `{data:{admin}}`
- `PATCH /:id` — body any of `{username,email,name,role,avatarUrl}` → 200 `{data:{admin}}`
- `DELETE /:id` → 200; 404 not found; 400 if target is SUPERADMIN

### `/api/farmers` (auth required for all; write ops need `ADMIN|SUPERADMIN`; VIEWER read-only)
- `GET /?page&limit&search` → `{data:{farmers:[], meta:{page,limit,total}}}` (default page=1, limit=20)
- `GET /:id` → `{data:{farmer}}` (includes `goats`); 404
- `GET /:id/chat-messages?limit` (default 100) → `{data:{messages:[]}}` looked up by farmer's whatsappPhone; 404 if farmer missing
- `POST /` (ADMIN/SUPERADMIN) — body `{name, address?, whatsappPhone}` → 201; 400 missing required; 409 duplicate phone
- `PATCH /:id` (ADMIN/SUPERADMIN) — body any of `{name,address,whatsappPhone}` → 200; 400 empty body; 409 dup phone; 404
- `DELETE /:id` (ADMIN/SUPERADMIN) → 200; 404 (cascade deletes goats/recordings)
- `POST /:id/reminder` (ADMIN/SUPERADMIN) → sends single WA reminder → 200 `{message}`; 404

### `/api/goats` (auth required; write ops ADMIN/SUPERADMIN)
- `GET /?page&limit&farmerId` → `{data:{goats:[], meta}}` (includes `farmer`)
- `GET /next-ear-tag` → `{data:{nextEarTagNumber: string}}` — max existing numeric earTagNumber + 1, as string. **Route order matters: this is defined before `/:id`.**
- `GET /:id` → `{data:{goat}}` (includes `farmer`, `recordings` desc); 404
- `POST /` (ADMIN/SUPERADMIN) — body `{earTagNumber, farmerId}` → 201; 400 missing; 409 dup ear tag; 400 P2003 (farmer not found)
- `PATCH /:id` (ADMIN/SUPERADMIN) — body `{earTagNumber?, farmerId?}` → 200; 400 empty; 409 dup; 404
- `DELETE /:id` (ADMIN/SUPERADMIN) → 200; 404 (cascade deletes recordings)

### `/api/recordings` (auth required; write ops ADMIN/SUPERADMIN)
- `GET /?page&limit&status&goatId&farmerId` → `{data:{recordings:[], meta}}` (includes `goat.farmer`); 400 invalid status
- `GET /:id` → `{data:{recording}}`; 404
- `POST /` (ADMIN/SUPERADMIN) — body `{goatId, matingDate?, birthDate?, maleKidCount?, femaleKidCount?, matingNumber?, saleTarget?, sold?, notes?, photoUrl?, photoPublicId?}` — `senderName` auto-set from `req.user.name`; forced `status: FINAL, source: MANUAL` → 201; 400 missing goatId; 400 P2003 goat not found
- `PATCH /:id` (ADMIN/SUPERADMIN) — body: any recording fields + `status?` (PERLU_REVIEW|FINAL) → 200; 400 empty/invalid status; 404. Changing `photoUrl` auto-deletes old Cloudinary image server-side.
- `DELETE /:id` (ADMIN/SUPERADMIN) → 200; 404 (also deletes Cloudinary photo if present)

### `/api/follow-ups` (auth required; POST needs ADMIN/SUPERADMIN)
- `GET /?days` (default 30) → `{data:{farmers:[], days}}` — farmers with zero recordings across all goats in the period (includes `goats`)
- `POST /reminders` — body `{days?}` (default 30) → bulk-sends WA reminder to all not-reported farmers → 200 `{data:{sentCount, failedCount}}`

### `/api/dashboard` (auth required, all roles incl. VIEWER)
- `GET /summary` → `{data:{summary:{totalFarmers, totalGoats, recordingsLast7Days, recordingsLast30Days, pendingReviewCount, farmersNotReportedCount, lastSync:{lastSyncAt,lastStatus,lastError}}}}`
- `GET /charts` → `{data:{charts:{recordingTrend:[{date:"YYYY-MM-DD",count}], kidsBornByGender:{male,female}, soldVsTarget:{sold,targetOnly}}}}` — last 30 days only. `sold` counted via regex `/ya/i` on the `sold` string field.
- `GET /alerts` → `{data:{alerts:[{goatId, earTagNumber, farmerId, farmerName}]}}` — goats with no recording in last 30 days

### `/api/sync`
- `GET /status` (auth only, any role) → `{data:{sync:{lastSyncAt,lastStatus,lastError}}}`
- `POST /retry` (auth + ADMIN/SUPERADMIN) → runs full Sheets sync synchronously → 200/500

### `/api/uploads` (auth required; POST needs ADMIN/SUPERADMIN)
- `POST /photo` — multipart/form-data, field name **`photo`**, JPEG/PNG only, max 5MB → 201 `{data:{url, publicId}}`; 400 bad file/type/size. Use this to get `photoUrl`/`photoPublicId` before creating/updating a Recording.

### `/api/webhook` — WhatsApp webhook, not used by frontend.

## Role → access summary for frontend route/UI gating
- **SUPERADMIN**: everything, plus `/api/admins` CRUD (manage ADMIN/VIEWER accounts)
- **ADMIN**: full CRUD on farmers/goats/recordings, follow-ups, uploads, sync retry, dashboard, chat history, profile edit. Cannot manage other admin accounts.
- **VIEWER**: read-only — GET on farmers/goats/recordings/dashboard/sync status/follow-up list/chat-messages. No POST/PATCH/DELETE anywhere, no admin management, no reminders, no uploads.

## Login with Google
Uses `google-auth-library` `OAuth2Client.verifyIdToken` server-side with `GOOGLE_CLIENT_ID`. Frontend needs Google Identity Services to obtain an `idToken` client-side (One Tap or button), then POST `{idToken}` to `/api/auth/google`. This matches the `login-with-google` skill's expected flow. Note: **no self-registration** — a Google login only succeeds if the email or googleId already exists as an Admin created by SUPERADMIN first.

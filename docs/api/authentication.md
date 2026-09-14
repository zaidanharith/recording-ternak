# Authentication API

Base path: `/api/auth`. See [`backend/authentication.md`](../backend/authentication.md) for implementation detail and [`error-response.md`](error-response.md) for the response envelope.

> This is now the **shared auth backend for both apps** — dashboard-kematian-ternak has no local users table; its `/api/auth/*` and `/api/users/*` proxy straight to these endpoints. See [ADR-006](../decisions/adr-006-integration-with-dashboard-kematian-ternak.md).

## `POST /api/auth/login`

Email + password login. No auth required.

Request:
```json
{ "email": "admin@example.com", "password": "secret123" }
```

Response `200`:
```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "token": "eyJhbGciOi...",
    "admin": { "id": "…", "username": "admin", "email": "admin@example.com", "name": "Admin", "role": "SUPERADMIN" }
  }
}
```

Errors: `400` if `email`/`password` missing, `401` if the email isn't found, has no password set (Google-only account), or the password doesn't match.

## `POST /api/auth/google`

Google Sign-In. No auth required. The account must already exist (created by a `SUPERADMIN` via `/api/admins`) — Google login never self-registers.

Request:
```json
{ "idToken": "<Google ID token from @react-oauth/google>" }
```

Response `200`: same shape as `/login`. Behavior:
1. Verifies `idToken` against **either** `GOOGLE_CLIENT_ID` (this app's own OAuth client) **or** `DASHBOARD_GOOGLE_CLIENT_ID` (dashboard-kematian-ternak's) via `google-auth-library` — both frontends keep their own Google OAuth client, but verification is centralized here, so both audiences must be accepted.
2. Looks up admin by `googleId`; if not found, falls back to lookup by `email` and links `googleId` to that account.
3. If no matching admin exists at all → `403` ("Akun belum terdaftar. Hubungi SUPERADMIN untuk didaftarkan.").

Errors: `400` missing `idToken` or unverified Google email, `401` invalid/expired ID token, `403` account not pre-registered.

## `GET /api/auth/me`

Returns the logged-in admin's profile. Requires `Authorization: Bearer <token>`.

Response `200`:
```json
{ "success": true, "data": { "admin": { "id": "…", "username": "admin", "email": "…", "name": "…", "role": "ADMIN", "avatarUrl": null } } }
```

## `PATCH /api/auth/me`

Update own profile: `name`, `avatarUrl`, or change password. Requires auth.

Request (password change):
```json
{ "currentPassword": "old123", "newPassword": "newSecurePass456" }
```

Rules: changing `newPassword` requires a matching `currentPassword` (`400` if missing or wrong). At least one field must change (`400` "Tidak ada data yang diubah." otherwise).

Response `200`: `{ "success": true, "message": "Profil berhasil diperbarui.", "data": { "admin": { … } } }`

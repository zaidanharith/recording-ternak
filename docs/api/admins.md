# Admins API

Base path: `/api/admins`. All endpoints require `Authorization: Bearer <token>` **and** role `SUPERADMIN` (`router.use(authMiddleware, requireRole('SUPERADMIN'))`). This is the only way to provision new dashboard accounts — there is no public signup.

## `GET /api/admins`

List all admin accounts (passwords stripped).

Response `200`:
```json
{ "success": true, "data": { "admins": [ { "id": "…", "username": "budi", "email": "budi@example.com", "name": "Budi", "role": "ADMIN", "googleId": null, "avatarUrl": null } ] } }
```

## `POST /api/admins`

Create an admin or viewer account with a password.

Request:
```json
{ "username": "budi", "email": "budi@example.com", "password": "secret123", "name": "Budi", "role": "ADMIN", "avatarUrl": null }
```

`role` must be `ADMIN` or `VIEWER` — `SUPERADMIN` cannot be assigned through this endpoint. Errors: `400` missing required field or invalid role, `409` if `username`/`email` already exists, `500` otherwise.

Response `201`: `{ "success": true, "message": "Akun berhasil dibuat.", "data": { "admin": { … } } }`

## `PATCH /api/admins/:id`

Partial update: `username`, `email`, `name`, `role` (`ADMIN`/`VIEWER` only), `avatarUrl`.

Response `200`: `{ "success": true, "message": "Akun berhasil diperbarui.", "data": { "admin": { … } } }`

## `DELETE /api/admins/:id`

Deletes a non-`SUPERADMIN` account. Response `400` if the target is `SUPERADMIN` ("Akun SUPERADMIN tidak dapat dihapus melalui endpoint ini."), `404` if not found.

Response `200`: `{ "success": true, "message": "Akun berhasil dihapus." }`

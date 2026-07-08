# Sync API

Base path: `/api/sync`. Exposes the health of the DB → Google Sheets mirror described in [`system-design.md`](../architecture/system-design.md#data-consistency-db--sheets).

## `GET /api/sync/status`

Requires auth (any role).

Response `200`:
```json
{ "success": true, "data": { "sync": { "lastSyncAt": "2026-07-08T08:00:00.000Z", "lastStatus": "SUCCESS", "lastError": null } } }
```

`lastStatus` is one of `BELUM_PERNAH` (never synced), `SUCCESS`, `FAILED`. If no sync has ever run, `sync` is a placeholder object with `lastStatus: "BELUM_PERNAH"` rather than `null`.

## `POST /api/sync/retry`

Requires `ADMIN` or `SUPERADMIN`. Forces a full resync: clears every row (keeping headers) in the `Recording`, `Kambing`, and `Peternak` sheets and rewrites them from the current database state. This is the same operation the backend runs automatically when it detects a row-count mismatch after a WhatsApp save — this endpoint just lets an admin trigger it on demand.

Response `200`: `{ "success": true, "message": "Sinkronisasi ulang berhasil." }`, or `500` with `message: "Sinkronisasi ulang gagal."` if the Sheets API call fails (the failure is also recorded to `sync_status.lastError`).

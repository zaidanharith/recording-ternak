# Goats API (Kambing)

Base path: `/api/goats`. All endpoints require auth; write endpoints require `ADMIN` or `SUPERADMIN`.

## `GET /api/goats`

Query params: `page`, `limit`, `farmerId` (filter to one farmer's goats). Each goat includes its `farmer`.

Response `200`: `{ "success": true, "data": { "goats": [ { "id": "…", "earTagNumber": 12, "farmerId": "…", "farmer": { … } } ], "meta": { "page": 1, "limit": 20, "total": 30 } } }`

## `GET /api/goats/next-ear-tag`

Returns the next unused sequential ear tag number, computed as `max(existing earTagNumber) + 1`. Used by the dashboard's "Add Goat" form to prefill a suggestion.

Response `200`: `{ "success": true, "data": { "nextEarTagNumber": 31 } }`

> Route order note: this is registered before `/:id` in `goat.route.js` so `"next-ear-tag"` is never matched as an `:id` path param.

## `GET /api/goats/:id`

Includes `farmer` and all `recordings` (newest first). `404` if not found.

## `POST /api/goats`

Request: `{ "earTagNumber": 31, "farmerId": "…" }`, both required. `earTagNumber` must be an integer (`400` otherwise).

Errors: `400` missing fields or `farmerId` doesn't exist (Prisma `P2003`), `409` if `earTagNumber` already used.

## `PATCH /api/goats/:id`

Partial update: `earTagNumber`, `farmerId` (re-assign to a different farmer). `400` no fields, `409` duplicate ear tag, `404` not found.

## `DELETE /api/goats/:id`

Cascades to the goat's recordings. `404` if not found.

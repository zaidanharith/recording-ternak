# Farmers API (Peternak)

Base path: `/api/farmers`. All endpoints require auth. Write endpoints (`POST`/`PATCH`/`DELETE`/reminder) require role `ADMIN` or `SUPERADMIN`; `GET` endpoints allow any authenticated role including `VIEWER`.

> Every create/update/delete here is also pushed to dashboard-kematian-ternak's `Peternak` table (same row id on both sides) so the two apps' farmer/peternak data stays in sync. See [`api/internal.md`](internal.md) and [ADR-006](../decisions/adr-006-integration-with-dashboard-kematian-ternak.md). The push is best-effort — a failed sync is logged but never blocks or rolls back the local write.

## `GET /api/farmers`

Paginated, searchable list.

Query params: `page` (default `1`), `limit` (default `20`), `search` (matches `name` case-insensitively or `whatsappPhone`).

Response `200`:
```json
{ "success": true, "data": { "farmers": [ { "id": "…", "name": "Budi", "address": "Dusun Krajan", "whatsappPhone": "6281234567890" } ], "meta": { "page": 1, "limit": 20, "total": 12 } } }
```

## `GET /api/farmers/:id`

Includes the farmer's `goats`. `404` if not found.

## `GET /api/farmers/:id/chat-messages`

WhatsApp conversation history for this farmer's number. Query param `limit` (default `100`).

Response `200`: `{ "success": true, "data": { "messages": [ { "id": "…", "phone": "628…", "role": "user", "content": "kambing 12 kawin kemarin", "createdAt": "…" } ] } }`

`role` is `"user"` or `"bot"`, ordered oldest → newest.

## `POST /api/farmers`

Request: `{ "name": "Budi", "address": "Dusun Krajan", "whatsappPhone": "6281234567890" }` — `name` and `whatsappPhone` are required; `address` defaults to `"-"`.

`409` if `whatsappPhone` is already registered.

## `PATCH /api/farmers/:id`

Partial update of `name`, `address`, `whatsappPhone`. `400` if no fields given, `409` on duplicate phone, `404` if not found.

## `DELETE /api/farmers/:id`

Cascades to the farmer's goats and their recordings (see [`database-schema.md`](../architecture/database-schema.md)). `404` if not found.

## `POST /api/farmers/:id/reminder`

Sends a fixed WhatsApp reminder text to this farmer via `whatsapp.service.js`. Response `200`: `{ "success": true, "message": "Reminder berhasil dikirim ke Budi." }`. For bulk reminders across many farmers at once, see [`follow-ups.md`](follow-ups.md).

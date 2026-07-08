# Follow-ups API

Base path: `/api/follow-ups`. Surfaces farmers who haven't submitted any recording recently, so admins can nudge them. All endpoints require auth; sending reminders requires `ADMIN` or `SUPERADMIN`.

## `GET /api/follow-ups`

Query param: `days` (default `30`) — a farmer is "not reported" if none of their goats have a recording with `createdAt >= now - days`.

Response `200`: `{ "success": true, "data": { "farmers": [ { "id": "…", "name": "Budi", "goats": [ … ] } ], "days": 30 } }`

## `POST /api/follow-ups/reminders`

Sends the same fixed reminder message used by [`POST /api/farmers/:id/reminder`](farmers.md#post-apifarmersidreminder) to every farmer currently matching the "not reported" query, in parallel (`Promise.allSettled` — one delivery failure doesn't block the rest).

Request: `{ "days": 30 }` (optional, defaults to 30).

Response `200`: `{ "success": true, "message": "Reminder terkirim ke 8 peternak, 1 gagal.", "data": { "sentCount": 8, "failedCount": 1 } }`

# Internal API (service-to-service sync)

Base path: `/internal` (note: **not** under `/api`, mounted separately in `server.js`). These endpoints are not for the frontend — they exist only so dashboard-kematian-ternak can push Peternak changes here to keep `Farmer` in sync. See [ADR-006](../decisions/adr-006-integration-with-dashboard-kematian-ternak.md) and [`architecture/database-schema.md`](../architecture/database-schema.md#cross-app-notes).

Auth: header `x-internal-key` must exactly match `INTERNAL_API_KEY` (`internal-key.middleware.js`) — **not** a user JWT. `401` if missing or wrong.

| Method | Path | Description |
|---|---|---|
| `PUT` | `/internal/farmers/:id` | Upsert a Farmer by id (called by dashboard when a Peternak is created/updated) |
| `DELETE` | `/internal/farmers/:id` | Delete a Farmer by id (called by dashboard when a Peternak is deleted) |

## `PUT /internal/farmers/:id`

The `:id` is the **same id** as the corresponding `Peternak` row in dashboard's database — Farmer and Peternak rows for the same person always share their primary key, which is how the two tables stay correlated without a separate mapping table.

Request:
```json
{ "nama": "Pak Slamet", "desa": "Besuki", "dusun": "Krajan", "rt": "001", "rw": "002", "telepon": "081234567890" }
```

`nama` and `telepon` are required (mapped to `Farmer.name`/`Farmer.whatsappPhone`); the rest default the same way `createFarmer` does. `409` if `telepon` collides with a different farmer's `whatsappPhone`.

## `DELETE /internal/farmers/:id`

Idempotent — returns `200` even if the farmer was already gone (so a retried or out-of-order delete never fails).

## The other direction

recording-ternak pushes its own Farmer changes out to dashboard's `PUT`/`DELETE /internal/peternak/:id` the same way (`dashboard-sync.service.js`, called from `farmer.controller.js` after every create/update/delete). Both directions are **best-effort**: a failed push is logged, not retried, and never rolls back the local write — see [ADR-006](../decisions/adr-006-integration-with-dashboard-kematian-ternak.md#consequences) for why that tradeoff was accepted at this scale.

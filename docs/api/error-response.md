# Error Response Convention

Every backend response uses a flat JSON envelope. There is no global Express error-handling middleware — each controller catches its own errors and shapes the response.

## Success

```json
{
  "success": true,
  "message": "Peternak berhasil ditambahkan.",
  "data": { "farmer": { "id": "…", "name": "Budi", "address": "-", "whatsappPhone": "6281234567890" } }
}
```

`message` is present on mutating endpoints (POST/PATCH/DELETE), often omitted on GET list/detail endpoints. `data` wraps the payload under a named key (`farmer`, `farmers`, `goat`, `recording`, `admin`, `summary`, `charts`, `alerts`, `sync`, `messages`, `url`/`publicId`, ...) rather than being returned bare.

## Error

```json
{
  "success": false,
  "message": "Peternak tidak ditemukan.",
  "error": "Record to update not found."
}
```

- `message` is a human-readable Indonesian string safe to show in the dashboard UI.
- `error` (only on 500s and a few validation paths) carries the raw error message for debugging — it is not sanitized, so avoid surfacing it directly in end-user-facing UI.

## Status codes

| Code | Meaning | Typical cause |
|---|---|---|
| `200` | OK | Successful GET/PATCH/DELETE |
| `201` | Created | Successful POST |
| `400` | Bad request | Missing required field, invalid enum value (`status`, `role`), no fields to update |
| `401` | Unauthorized | Missing/invalid/expired JWT, invalid Google ID token, wrong login credentials |
| `403` | Forbidden | Role not permitted (`role.middleware.js`), Google account not pre-registered |
| `404` | Not found | Resource ID doesn't exist |
| `409` | Conflict | Unique constraint violation (Prisma `P2002`) — duplicate `whatsappPhone` or `earTagNumber` |
| `500` | Server error | Unhandled exception; message is generic, detail is in `error` |

## Prisma error code mapping

Controllers inspect `error.code` from Prisma Client Known Request Errors and translate them into the table above instead of leaking a raw Prisma error:

| Prisma code | Meaning | Mapped to |
|---|---|---|
| `P2002` | Unique constraint failed | `409` |
| `P2003` | Foreign key constraint failed (e.g. `farmerId` doesn't exist) | `400` |
| `P2025` | Record to update/delete not found | `404` |

## Pagination envelope

List endpoints (`GET /api/farmers`, `/api/goats`, `/api/recordings`) return:

```json
{
  "success": true,
  "data": {
    "farmers": [ ],
    "meta": { "page": 1, "limit": 20, "total": 42 }
  }
}
```

`page` and `limit` are echoed back from the query string (defaults `1` and `20`); `total` is the unfiltered/filtered row count for computing page count client-side.

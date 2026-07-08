# Recordings API

Base path: `/api/recordings`. A "recording" is one health/breeding report for a goat — created either by a farmer over WhatsApp (`source: WA`, starts as `status: PERLU_REVIEW`) or by an admin directly in the dashboard (`source: MANUAL`, always `status: FINAL`). All endpoints require auth; write endpoints require `ADMIN` or `SUPERADMIN`.

## `GET /api/recordings`

Query params: `page`, `limit`, `status` (`PERLU_REVIEW` | `FINAL`), `goatId`, `farmerId` (filters via the related goat). Each recording includes `goat.farmer`.

Response `200`:
```json
{
  "success": true,
  "data": {
    "recordings": [ {
      "id": "…", "goatId": "…", "senderName": "Budi",
      "matingDate": "12/06/2026", "birthDate": "-", "maleKidCount": "-", "femaleKidCount": "-",
      "matingNumber": "2", "saleTarget": "-", "sold": "-", "notes": "-",
      "status": "PERLU_REVIEW", "source": "WA", "photoUrl": null, "photoPublicId": null,
      "createdAt": "…", "goat": { "earTagNumber": "12", "farmer": { "name": "Budi" } }
    } ],
    "meta": { "page": 1, "limit": 20, "total": 55 }
  }
}
```

`400` if `status` is not one of `PERLU_REVIEW`/`FINAL`.

## `GET /api/recordings/:id`

`404` if not found.

## `POST /api/recordings`

Manual entry from the dashboard. `goatId` is required; `senderName` is taken from the authenticated admin (`req.user.name`), not the request body. Always created with `status: FINAL`, `source: MANUAL`.

Request:
```json
{ "goatId": "…", "matingDate": "12/06/2026", "birthDate": "-", "maleKidCount": "1", "femaleKidCount": "0", "matingNumber": "2", "saleTarget": "-", "sold": "Belum", "notes": "-", "photoUrl": null, "photoPublicId": null }
```

`400` if `goatId` missing, `400` if `goatId` doesn't reference an existing goat (Prisma `P2003`).

To attach a photo, first upload it via [`POST /api/uploads/photo`](uploads.md) to get `photoUrl`/`photoPublicId`, then pass those here.

## `PATCH /api/recordings/:id`

Partial update of any report field plus `status` (used by admins to move `PERLU_REVIEW` → `FINAL` after checking an AI-submitted report).

Photo replacement: if `photoUrl` changes and the previous recording had a different `photoPublicId`, the old Cloudinary asset is deleted after the update succeeds (fire-and-forget, not awaited).

`400` invalid `status` or no fields changed, `404` not found.

## `DELETE /api/recordings/:id`

Deletes the recording and, if it had a photo, deletes the Cloudinary asset (fire-and-forget). `404` if not found.

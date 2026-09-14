# Kelahiran API

Base path: `/api/kelahiran`. All endpoints require auth. Same proxy pattern as [`kematian.md`](kematian.md) — every endpoint here calls dashboard-kematian-ternak's backend and forwards the caller's JWT. Results are filtered to Kambing-only ternak.

Unlike kematian (which upserts an existing Ternak), a birth is always a **new** Ternak registration — there's no "reuse if it already exists" step.

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/kelahiran/goats/:goatId/generate` | `ADMIN`, `SUPERADMIN` | Register the goat as a new Ternak, create the laporan, and return the generated akta |
| `GET` | `/api/kelahiran` | Any authenticated role | List all Kambing birth reports |
| `GET` | `/api/kelahiran/:id` | Any authenticated role | Detail of one report |
| `GET` | `/api/kelahiran/:id/download?format=docx\|pdf` | Any authenticated role | Re-download the akta for an existing report |
| `PATCH` | `/api/kelahiran/:id` | `ADMIN`, `SUPERADMIN` | Edit tanggal lahir/catatan/nomor akta |
| `DELETE` | `/api/kelahiran/:id` | `ADMIN`, `SUPERADMIN` | Delete the report (also deletes the Ternak — a laporan kelahiran *is* the ternak's registration) |

## `POST /api/kelahiran/goats/:goatId/generate`

Request:
```json
{
  "jenisKelamin": "BETINA",
  "tanggalLahir": "2026-01-01",
  "rasRumpun": "Kambing Jawa",
  "catatan": "Lahir normal",
  "format": "docx"
}
```

`jenisKelamin` and `tanggalLahir` are required (unlike kematian's provisioning step, these can't be filled in later — a birth report needs them up front). `format` defaults to `docx`.

Flow (see `kelahiran.service.js`):
1. **Resolve the Kambing `jenisTernakId`** — recording-ternak has no concept of jenis ternak, so it looks it up via dashboard's `GET /api/jenis-ternak` and finds the one named `"Kambing"`.
2. **Create the laporan** — `POST /api/laporan-kelahiran` on dashboard with `kodeTernak: String(goat.earTagNumber)`, the resolved `jenisTernakId`, `peternakId: goat.farmerId`, and the body fields above. This creates both a new `Ternak` row and the `LaporanKelahiran` in one transaction on dashboard's side. Fails with `400` if `kodeTernak` is already used (e.g. this goat was already provisioned via the kematian flow or a bulk import).
3. **Return the document** — `GET /api/laporan-kelahiran/:id/akta?format=…`, streamed back as the response body.

Response `200`: the file itself. Errors from any step are forwarded with dashboard's original status code and message.

## `GET /api/kelahiran`

Response `200`:
```json
{
  "success": true,
  "data": {
    "laporanKelahiran": [
      {
        "id": "…",
        "ternakId": "…",
        "tanggalLahir": "2026-01-01",
        "catatan": null,
        "nomorAkta": null,
        "ternak": {
          "kodeTernak": "12",
          "jenisKelamin": "BETINA",
          "tanggalLahir": "2026-01-01",
          "peternak": { "id": "…", "nama": "Pak Slamet" },
          "jenisTernak": { "id": "…", "nama": "Kambing" }
        }
      }
    ]
  }
}
```

## `GET /api/kelahiran/:id` / `PATCH /api/kelahiran/:id` / `DELETE /api/kelahiran/:id`

Same shapes as dashboard's own [`laporan-kelahiran` API](../../../dashboard-kematian-ternak/docs/api/laporan-kelahiran.md) — this is a thin pass-through, not reimplemented.

## `GET /api/kelahiran/:id/download`

Same as step 3 of the generate flow, for re-downloading a report that was already created. `format` query param (`docx`|`pdf`, default `docx`).

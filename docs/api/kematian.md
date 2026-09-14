# Kematian API

Base path: `/api/kematian`. All endpoints require auth. This is **not a local resource** — every endpoint here proxies to dashboard-kematian-ternak's backend (`DASHBOARD_API_URL`, header `x-internal-key: INTERNAL_API_KEY`, plus the caller's JWT forwarded so the dashboard's own auth/role checks still apply). See [ADR-006](../decisions/adr-006-integration-with-dashboard-kematian-ternak.md) for why.

Results are always filtered to ternak whose `jenisTernak.nama` is `"Kambing"` — dashboard-kematian-ternak tracks death reports for every species, recording-ternak only cares about goats.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/kematian/form-options` | Any authenticated role | Penyebab kematian options for the generate form |
| `POST` | `/api/kematian/goats/:goatId/generate` | `ADMIN`, `SUPERADMIN` | Provision the goat as a Ternak, create the laporan, and return the generated document |
| `GET` | `/api/kematian` | Any authenticated role | List all Kambing death reports |
| `GET` | `/api/kematian/:id` | Any authenticated role | Detail of one report |
| `GET` | `/api/kematian/:id/download?format=docx\|pdf` | Any authenticated role | Re-download the berita acara for an existing report |
| `PATCH` | `/api/kematian/:id` | `ADMIN`, `SUPERADMIN` | Edit penyebab/tanggal/catatan |
| `DELETE` | `/api/kematian/:id` | `ADMIN`, `SUPERADMIN` | Delete the report (reverts the Ternak's status to `HIDUP`) |

## `GET /api/kematian/form-options`

Response `200`:
```json
{ "success": true, "data": { "penyebabKematian": [ { "id": "…", "nama": "Penyakit" } ] } }
```

## `POST /api/kematian/goats/:goatId/generate`

Request:
```json
{
  "tanggalKematian": "2026-01-01",
  "penyebabKematianId": "…",
  "catatan": "Ditemukan mati di kandang",
  "jenisKelamin": "JANTAN",
  "tanggalLahir": "2024-01-01",
  "rasRumpun": "Kambing Jawa",
  "format": "docx"
}
```

`tanggalKematian` and `penyebabKematianId` are required. `jenisKelamin`, `tanggalLahir`, `rasRumpun` are only needed the **first** time this goat is used — see the provisioning flow below. `format` defaults to `docx`.

Flow (see `kematian.service.js`):
1. **Provision the Ternak** — calls dashboard's `POST /api/ternak/provision` with `kodeTernak: String(goat.earTagNumber)` and `jenisTernakNama: "Kambing"`. If a Ternak with that `kodeTernak` already exists, it's reused as-is (the optional fields are ignored); otherwise a new one is created — `jenisKelamin`/`tanggalLahir` may be omitted here and filled in later via dashboard (see [`architecture/database-schema.md`](../architecture/database-schema.md#cross-app-notes)).
2. **Create the laporan** — `POST /api/laporan-kematian` on dashboard with the resolved `ternakId`. Fails with `400` if the Ternak's `jenisKelamin`/`tanggalLahir` are still missing (dashboard enforces this before allowing a legal document to be generated) or if it's already reported dead.
3. **Return the document** — `GET /api/laporan-kematian/:id/berita-acara?format=…`, streamed straight back as the response body.

Response `200`: the file itself (`Content-Type`/`Content-Disposition` forwarded from dashboard). Errors from any step are forwarded with dashboard's original status code and message.

## `GET /api/kematian`

Response `200`:
```json
{
  "success": true,
  "data": {
    "laporanKematian": [
      {
        "id": "…",
        "ternakId": "…",
        "penyebabKematianId": "…",
        "tanggalKematian": "2026-01-01",
        "catatan": null,
        "nomorBeritaAcara": null,
        "ternak": {
          "kodeTernak": "12",
          "jenisKelamin": "JANTAN",
          "tanggalLahir": "2024-01-01",
          "peternak": { "id": "…", "nama": "Pak Slamet" },
          "jenisTernak": { "id": "…", "nama": "Kambing" }
        },
        "penyebabKematian": { "id": "…", "nama": "Penyakit" }
      }
    ]
  }
}
```

## `GET /api/kematian/:id` / `PATCH /api/kematian/:id` / `DELETE /api/kematian/:id`

Same shapes as dashboard's own [`laporan-kematian` API](../../../dashboard-kematian-ternak/docs/api/laporan-kematian.md) — this is a thin pass-through, not reimplemented.

## `GET /api/kematian/:id/download`

Same as step 3 of the generate flow, for re-downloading a report that was already created. `format` query param (`docx`|`pdf`, default `docx`).

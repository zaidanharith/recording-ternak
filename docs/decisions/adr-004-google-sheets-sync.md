# ADR-004: Google Sheets as a Stakeholder-Facing Read Mirror

## Status
Accepted

## Context
Non-technical stakeholders — village officials, veterinary partners in the KKN collaboration — need to view livestock data without learning a new dashboard or getting API/DB access. Google Sheets is a format they already know, and it's trivially shareable via Google Drive.

## Decision
PostgreSQL remains the single source of truth ([ADR-001](adr-001-prisma-postgresql.md)). After every confirmed WhatsApp report, the backend also appends/upserts the same data into three Google Sheets tabs (`Recording`, `Kambing`, `Peternak`) via `sheets.service.js`. Because this write can silently fail or drift (Sheets API errors, manual edits in the sheet), `sync.service.js#verifySheetsConsistency` runs a lightweight row-count comparison after every save and triggers a full rewrite (`runFullSync`) from the DB whenever it detects a mismatch — see [`architecture/system-design.md`](../architecture/system-design.md#data-consistency-db--sheets).

## Consequences
- Sheets must be treated as read-only by stakeholders; manual edits there are not synced back to the DB and will be overwritten by the next full sync.
- The consistency check is row-count-based, not field-level — it catches missing/extra rows but would not catch a manually-edited cell value that doesn't change the row count, until the next full sync happens to touch that row.
- Full sync is O(all data) — acceptable at KKN project scale, but would need batching/incremental sync if farmer/recording volume grew by orders of magnitude.
- `sync.service.js`/`sheets.service.js` add a hard runtime dependency on the Google Sheets API being reachable and correctly authorized (see [`setup/troubleshooting.md`](../setup/troubleshooting.md)) for every report save, even though the sync itself runs non-blocking/async relative to the farmer's reply.

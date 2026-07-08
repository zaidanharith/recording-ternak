# Prisma Conventions

## Client

A single shared `PrismaClient` instance lives at `backend/src/lib/prisma.js`, imported by every `repositories/*.repository.js` file. Never instantiate `new PrismaClient()` elsewhere — on Vercel's serverless functions, redundant instances exhaust the database's connection limit quickly.

## Connection strings

- `DATABASE_URL` — pooled connection (`?pgbouncer=true`), used by the Prisma Client at runtime.
- `DIRECT_URL` — direct connection, used only for migrations (`prisma migrate dev`/`deploy`), since PgBouncer in transaction-pooling mode doesn't support the advisory locks Prisma Migrate needs.

Both are declared in `datasource db` in `schema.prisma`.

## Query patterns

- **Repositories only** touch `prisma.*` — see [`backend/coding-standards.md`](../backend/coding-standards.md#layering).
- **Pagination** — every list query uses the same `Promise.all([findMany({ skip, take }), count()])` pair to return both rows and a total in one round trip (see any of `listFarmers`, `listGoats`, `listRecordings`).
- **Search** — case-insensitive partial match via `{ contains: search, mode: 'insensitive' }`, e.g. farmer name/phone search.
- **Upserts** — used where WhatsApp-driven writes must be idempotent by a natural key: `findOrCreateFarmer` (key: `whatsappPhone`), `findOrCreateGoat` (key: `earTagNumber`), and `SyncStatus` (`id: "singleton"`) all use `upsert` or a `findUnique`-then-`create` pattern rather than blind `create`, since a farmer can message multiple times and re-trigger the same "first contact" path.
- **Cascade deletes** — `onDelete: Cascade` on `Goat.farmer` and `Recording.goat` relations means deleting a `Farmer` or `Goat` from the dashboard silently removes all dependent rows; there is no soft-delete or archival step.
- **Includes over separate queries** — related data (`farmer`, `goat`, `recordings`) is fetched via Prisma's `include` in the same query rather than N+1 follow-up calls, e.g. `findGoatById` includes both `farmer` and `recordings` in one call.

## Prisma error codes

See [`api/error-response.md`](../api/error-response.md#prisma-error-code-mapping) for how `P2002`/`P2003`/`P2025` map to HTTP status codes at the controller layer.

# ADR-001: Use Prisma + PostgreSQL as the System of Record

## Status
Accepted

## Context
The backend needs durable storage for farmers, goats, and recordings that supports relational integrity (a goat belongs to exactly one farmer, a recording belongs to exactly one goat), ad-hoc admin dashboard queries (search, filter, pagination), and — because the backend runs as stateless Vercel serverless functions — a place to persist WhatsApp conversation state (`Session`) between requests that may land on different lambda instances.

## Decision
Use PostgreSQL (hosted on Supabase) as the primary datastore, accessed exclusively through Prisma ORM/Prisma Client. Google Sheets (see [ADR-004](adr-004-google-sheets-sync.md)) is a downstream mirror, never the source of truth.

## Consequences
- Cascade deletes and foreign-key constraints are enforced by the database, simplifying repository code (no manual cleanup of orphaned goats/recordings).
- Prisma's generated client gives type safety and migration tooling (`prisma migrate`) at the cost of needing both a pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection string — see [`database/migration.md`](../database/migration.md).
- Because the WhatsApp bot's conversation state also lives here (`Session` model), the database is on the critical path for every farmer message, not just dashboard reads — a DB outage breaks both surfaces simultaneously.

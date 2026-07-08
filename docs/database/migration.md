# Migrations

## Commands

| Command | Use |
|---|---|
| `npm run db:push` | Push the current `schema.prisma` straight to the database, no migration file. Fast local iteration; **never** use against a database with data you need to preserve across schema changes it can't express safely. |
| `npm run db:migrate` | `prisma migrate dev` — creates a new timestamped migration under `backend/prisma/migrations/`, applies it, regenerates the client. Use once a schema change is ready to be tracked. |
| `npm run db:generate` | Regenerates the Prisma Client without touching the database — needed after manually pulling schema changes from git. |
| `npm run db:studio` | Opens Prisma Studio, a GUI for browsing/editing rows directly — useful for provisioning the very first `SUPERADMIN` account (see [`setup/installation.md`](../setup/installation.md#frontend-first-run)). |

`postinstall` in `backend/package.json` runs `prisma generate` automatically after `npm install`, so a fresh clone always has an up-to-date client without a manual step.

## Deploying a schema change

1. Edit `backend/prisma/schema.prisma`.
2. `npm run db:migrate` locally against a dev database — this creates the migration folder and applies it locally.
3. Commit the new folder under `backend/prisma/migrations/`.
4. In each target environment (staging/production), run `prisma migrate deploy` (applies pending migrations without prompting or generating a new one) against `DIRECT_URL` before deploying backend code that depends on the new schema — see [`setup/deployment.md`](../setup/deployment.md#database).

## Why `DIRECT_URL` for migrations

`DATABASE_URL` goes through Supabase's PgBouncer in transaction-pooling mode, which doesn't support the session-level advisory locks Prisma Migrate uses to coordinate concurrent migration runs. `DIRECT_URL` bypasses the pooler for this reason — see the `directUrl` field in `datasource db` in `schema.prisma`.

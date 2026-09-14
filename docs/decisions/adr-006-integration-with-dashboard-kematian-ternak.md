# ADR-006: Integrate with dashboard-kematian-ternak via HTTP, not a shared database

## Status
Accepted

## Context
Two separate apps exist for the same village livestock program: recording-ternak (WhatsApp-driven goat health records) and dashboard-kematian-ternak (death/birth report registry, generates the legal berita acara/akta documents). The organization wants:

- One shared users table instead of separate accounts per app.
- recording-ternak to gain a "generate berita acara/akta kelahiran" feature for goats, using dashboard-kematian-ternak's existing document generation — without duplicating that logic.
- The `Peternak`/`Farmer` tables to stay in sync between both apps' databases.
- recording-ternak's goats to always register as jenis ternak `"Kambing"` on dashboard's side; dashboard's own data isn't restricted to goats (it tracks all livestock species).

Both apps are separately deployed (own Vercel projects, own Postgres databases) and neither should become a hard dependency that takes the other down if it started as a single monolith.

## Decision
- **HTTP, not a shared/cross-database connection.** Each backend keeps its own Postgres database. Cross-app calls go over plain HTTP with a shared `INTERNAL_API_KEY` header for service-to-service requests, and the caller's JWT is forwarded so the callee's own role checks still apply for user-initiated actions.
- **recording-ternak's `Admin` table becomes the merged users table.** It already had every field dashboard needed. dashboard-kematian-ternak dropped its local `User` model entirely; its `/api/auth/*` and `/api/users/*` now proxy to recording-ternak's `/api/auth/*` and `/api/admins`. Both apps verify JWTs locally with the same `JWT_SECRET` — no per-request auth call, only at login/user-management time.
- **`Farmer` (recording-ternak) and `Peternak` (dashboard) stay separate tables**, correlated by sharing the same row `id`. Each app pushes its own create/update/delete to the other's `/internal/*` endpoints (`x-internal-key` guarded). This is a **best-effort, synchronous push, no retry queue** — acceptable at single-village scale; if one side is briefly unreachable, the mismatch is logged and self-heals on the next write to either side.
- **recording-ternak's kematian/kelahiran features are pure API clients of dashboard's existing endpoints** — no document generation logic is duplicated. A new `POST /api/ternak/provision` endpoint was added to dashboard (find-or-create a Ternak by `kodeTernak`) since recording-ternak has no `Ternak` concept of its own, only `Goat`. Every Ternak recording-ternak provisions is hardcoded to jenis ternak `"Kambing"`.
- **Google login audiences.** Both frontends kept their own Google OAuth Client ID, but verification is now centralized in recording-ternak — it accepts either Client ID as a valid audience rather than forcing both apps onto one shared OAuth client.

## Consequences
- Either app can be deployed, scaled, or taken down independently — a dashboard outage doesn't break recording-ternak's WhatsApp bot, and vice versa (only the newer cross-app features — kematian/kelahiran generation, peternak sync — degrade).
- No cross-database transactions are possible, so cross-app writes (e.g. syncing a Peternak) are not atomic with the local write. This was accepted deliberately rather than building retry/outbox infrastructure that this project's scale doesn't warrant — see the per-endpoint notes in [`api/internal.md`](../api/internal.md) and [`api/farmers.md`](../api/farmers.md).
- `INTERNAL_API_KEY` and `JWT_SECRET` must be **identical** across both apps' deployments (local `.env` and each Vercel project's environment variables) — a mismatch silently breaks the integration with 401s rather than a build-time error. See [`setup/environment.md`](../setup/environment.md).
- Historical data created before this integration existed (farmers/peternak registered independently in each app, pre-existing goats) needed a one-time backfill — the sync code only fires on new writes going forward.

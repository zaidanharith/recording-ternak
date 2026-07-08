# ADR-002: JWT Sessions with SUPERADMIN-Provisioned Accounts, Plus Optional Google Sign-In

## Status
Accepted

## Context
The dashboard is used by a small, known set of KKN team members and village stakeholders — not the general public. There's no need for self-service signup, but convenience of login (Google Sign-In) is valuable for non-technical users, while still requiring a human gatekeeper to decide who gets an account.

## Decision
- Auth tokens are stateless JWTs (7-day expiry), embedding `id`/`username`/`email`/`name`/`role` directly in the payload — no server-side session store needed for the dashboard (distinct from the WhatsApp bot's DB-backed `Session`, see [`architecture/system-design.md`](../architecture/system-design.md)).
- Accounts are only created by an existing `SUPERADMIN` via [`POST /api/admins`](../api/admins.md#post-apiadmins) — there is no public registration endpoint.
- Google Sign-In (`POST /api/auth/google`) is supported as an alternate *login* method for an already-provisioned account (matched by `googleId` or `email`), never as a way to self-register.

## Consequences
- Role changes require the affected admin to log in again before they take effect, since the role is baked into the JWT and not re-checked against the DB per request (see [`backend/authentication.md`](../backend/authentication.md)).
- Losing `JWT_SECRET` (or rotating it) invalidates every issued token at once — acceptable for this scale of user base.
- Onboarding a new admin is a two-step process (a `SUPERADMIN` creates the account, then the new admin logs in with a password or links Google) rather than one-step self-signup, which is an intentional access-control tradeoff given the small, trusted user base.

# Routing

Next.js 16 App Router. Two top-level segments:

| Path | File | Auth |
|---|---|---|
| `/` | `app/page.tsx` | Public — login form (email/password + Google Sign-In) |
| `/dashboard`, `/peternak`, `/peternak/[id]`, `/kambing`, `/recording`, `/follow-up`, `/pengaturan`, `/pengaturan/akun` | `app/(dashboard)/**/page.tsx` | Requires auth via `RouteGuard` in `app/(dashboard)/layout.tsx` |

`(dashboard)` is a route group — it doesn't add a `/dashboard`-prefixed URL segment, it only lets every nested page share the sidebar/header shell and the `RouteGuard` wrapper.

## Page → API resource mapping

| Route | Backed by |
|---|---|
| `/dashboard` | [`api/dashboard.md`](../api/dashboard.md) |
| `/peternak`, `/peternak/[id]` | [`api/farmers.md`](../api/farmers.md) (detail page also surfaces chat history) |
| `/kambing` | [`api/goats.md`](../api/goats.md) |
| `/recording` | [`api/recordings.md`](../api/recordings.md), photo upload via [`api/uploads.md`](../api/uploads.md) |
| `/follow-up` | [`api/follow-ups.md`](../api/follow-ups.md) — `ADMIN`/`SUPERADMIN` only, gated by `RoleGuard` |
| `/pengaturan` | [`api/admins.md`](../api/admins.md) — `SUPERADMIN` only for account management |
| `/pengaturan/akun` | [`api/authentication.md`](../api/authentication.md) (`PATCH /api/auth/me`) — own profile, any role |

## Navigation

`src/components/layout/nav-items.ts` defines the sidebar's `NAV_ITEMS`, each with an optional `roles: AdminRole[]` — omitted `roles` means visible to all authenticated roles. `AppSidebar` and `MobileNav` both consume this single list, so adding a new page only requires one edit to stay in sync across desktop/mobile nav.

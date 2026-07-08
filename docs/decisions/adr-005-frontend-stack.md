# ADR-005: Next.js App Router + shadcn/ui + Zustand for the Admin Dashboard

## Status
Accepted

## Context
The admin dashboard needs CRUD screens for several related resources (farmers, goats, recordings), role-gated sections, and a consistent visual style, built by a small team on a fixed KKN project timeline.

## Decision
- **Next.js 16 (App Router)** with route groups (`(dashboard)`) to share a sidebar/header shell and a single `RouteGuard` across all authenticated pages without repeating the wrapper on every page.
- **shadcn/ui** (Tailwind-based, copy-into-repo components) for the component library, themed via CSS custom properties in `globals.css` rather than a JS theme object — see [`frontend/design-system.md`](../frontend/design-system.md).
- **Zustand**, not Redux/Context, for the one piece of truly global client state (auth token + admin profile) — see [`frontend/state-management.md`](../frontend/state-management.md). Per-page data fetching is deliberately kept local (via `useAsync` + Axios services) rather than introducing a data-fetching/caching library, since the dashboard's data volume and update frequency don't warrant it.
- **react-hook-form + zod** for all forms, resolved via `@hookform/resolvers/zod`.

## Consequences
- Adding a new protected page only requires nesting it under `app/(dashboard)/` — no per-page auth boilerplate.
- shadcn's copy-in-repo model means UI primitives under `src/components/ui/` are local code, not a versioned dependency — upgrades are manual, but customization has no escape hatches to fight.
- Without a data-fetching library (React Query/SWR), there is no built-in cache invalidation or background refetching — pages re-fetch on mount/navigation via `useAsync`. If cross-page data staleness becomes a problem as the dashboard grows, that's the point to revisit this decision rather than ad-hoc patching individual pages.

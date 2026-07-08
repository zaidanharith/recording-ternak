# Component Conventions

## Layering

```
app/(dashboard)/**/page.tsx      → composes features + common components, fetches via services/*
src/features/<domain>/components → domain-specific UI (forms, dialogs, badges, selects)
src/components/common             → cross-domain reusable UI (guards, headers, empty states, pagination)
src/components/layout             → app shell (sidebar, header, mobile nav)
src/components/ui                 → shadcn primitives, generally left as generated
```

## Access control at the component level

Two distinct guards, used at different granularities:

- **`RouteGuard`** (`src/components/common/route-guard.tsx`) — wraps the entire `(dashboard)` route group in `app/(dashboard)/layout.tsx`. Redirects to `/` (login) once the Zustand store is hydrated and there is no token. Renders nothing until hydration completes, to avoid a flash of protected content.
- **`RoleGuard`** (`src/components/common/role-guard.tsx`) — wraps a page or section inside an already-authenticated route, e.g. `/pengaturan` (admin management) or `/follow-up`. Takes an `allow: AdminRole[]` prop and renders a "Anda tidak memiliki akses ke halaman ini." placeholder if the current admin's role isn't included, rather than redirecting.

For hiding individual nav items or buttons (not whole sections), see `src/lib/rbac.ts`'s `canManageData()` / `isSuperAdmin()` helpers and `NAV_ITEMS[].roles` in `src/components/layout/nav-items.ts` — consulted directly rather than wrapping every item in `RoleGuard`.

## Forms

`react-hook-form` + `@hookform/resolvers/zod`, with schemas in `src/lib/validation.ts`. Feature dialogs (e.g. `recording-form-dialog.tsx`, `farmer-form-dialog.tsx`, `goat-form-dialog.tsx`) follow the same pattern: a shadcn `Dialog` wrapping a `Form`, submitting through the matching `src/services/*.service.ts` module.

## Data fetching

No React Query/SWR — data fetching is done with the `useAsync` hook (`src/hooks/use-async.ts`) wrapping calls into `src/services/*.service.ts`, which are thin Axios wrappers around the REST API documented in [`../api/`](../api/). `useDebounce` (`src/hooks/use-debounce.ts`) is used for search inputs (e.g. farmer/goat search) to avoid firing a request per keystroke.

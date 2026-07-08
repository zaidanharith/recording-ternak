# State Management

## Global state: Zustand

A single store, `src/stores/auth.store.ts`, holds all cross-page global state: the JWT `token` and the logged-in `admin` object. There is intentionally no separate global store per feature — list/detail data for farmers, goats, and recordings is fetched per-page via `useAsync` + services, not cached globally.

```ts
interface AuthState {
  admin: Admin | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  updateAdmin: (admin: Admin) => void;
  logout: () => void;
  hydrate: () => void;
}
```

- `token`/`admin` are persisted to `localStorage` under `rt_token`/`rt_admin` on every `setAuth`/`updateAdmin`/`logout` call — not via Zustand's `persist` middleware, but manually inside each action.
- `isHydrated` starts `false` and flips to `true` only after `hydrate()` runs client-side (called once from `AuthHydrator`, `src/components/common/auth-hydrator.tsx`, mounted in `Providers`). This avoids `RouteGuard` making a redirect decision before `localStorage` has been read, which would otherwise cause a flash-redirect to `/` on every hard refresh of a protected page.

## Axios integration

`src/lib/axios.ts` creates a single `api` Axios instance:
- Request interceptor reads `rt_token` from `localStorage` and sets `Authorization: Bearer <token>` — this reads directly from `localStorage`, not from the Zustand store, so it works even in contexts without a React tree.
- Response interceptor: on any `401` (outside `/login`), clears both `localStorage` keys and hard-redirects to `/login` via `window.location.href` — a full page reload rather than a router push, which also resets in-memory Zustand state.

## Local/UI state

Everything else (form state, dialog open/closed, table pagination, search input) is component-local `useState`, or delegated to `react-hook-form` for forms. There is no separate feature-level global store; if a future feature needs list data shared across sibling pages, evaluate whether `useAsync`-per-page is still sufficient before reaching for a new store — see [ADR-005](../decisions/adr-005-frontend-stack.md).

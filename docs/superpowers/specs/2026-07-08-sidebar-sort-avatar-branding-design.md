# Sidebar Logout, Table Sort, Google Avatar & Branding — Design

Date: 2026-07-08

## Context

Four small, independent frontend/backend enhancements to the dashboard:

1. A logout affordance directly in the sidebar (currently only in the header dropdown `UserMenu`).
2. Client-side column sorting on the four existing data tables (Peternak, Kambing, Recording, Kelola Akun).
3. Auto-populating an admin's profile photo from their Google account on first Google login, while still letting them override it manually.
4. Displaying "Bumdes Sumber Abadi Desa Besuki" as the service provider in a few key places.

## 1. Table sorting

**Scope:** client-side only. Each table already paginates server-side (20 rows/page for Peternak/Kambing/Recording; unpaginated for Kelola Akun). Sorting will only reorder the rows currently loaded on screen — it does not request a different order from the backend. No backend changes for this feature.

**Building blocks:**

- `frontend/src/hooks/use-sortable-data.ts` — generic hook.
  - Input: `data: T[]`, `accessors: Record<string, (item: T) => string | number | null | undefined>`.
  - State: `{ key: string | null; direction: "asc" | "desc" | null }`.
  - `toggleSort(key)`: same key cycles `asc → desc → none (null)`; a different key resets to `asc`.
  - Returns `{ sortedData, sortKey, sortDirection, toggleSort }`. When `direction` is `null`, `sortedData === data` (original order/insertion order preserved).
  - Sorting: strings compared via `localeCompare` (id-ID), numbers/dates numerically, `null`/`undefined` sorted last regardless of direction.

- `frontend/src/components/common/sortable-table-head.tsx` — presentational wrapper around `TableHead`.
  - Props: `sortKey: string`, `currentKey`, `currentDirection`, `onSort(key)`, `children`.
  - Renders the header label as a button with an up/down chevron indicator (react-icons `FiChevronUp`/`FiChevronDown`, muted when inactive, colored when active for that column).

**Applied to:**

| Page | Sortable columns |
|---|---|
| `peternak/page.tsx` | Nama, Nomor WhatsApp, Alamat |
| `kambing/page.tsx` | No. Telinga, Peternak, Terdaftar (createdAt) |
| `recording/page.tsx` | Kambing, Peternak, Tanggal Lahir, Sumber, Status |
| `pengaturan/akun/page.tsx` | Nama, Username, Email, Role |

Action columns (edit/delete) and the photo column (Recording) are not sortable. Each page wires its `data.xxx` array through `useSortableData` before mapping to rows.

## 2. Sidebar logout button

- `AppSidebar` (`components/layout/app-sidebar.tsx`): add a footer block below `SidebarNav`, pinned to the bottom via `mt-auto`, showing the admin's avatar (reuse the existing `initials()` pattern from `UserMenu`) + name, and a "Keluar" button. Clicking calls `useAuthStore().logout()` then `router.replace("/")`, mirroring `UserMenu`'s `handleLogout`.
- `MobileNav` (`components/layout/mobile-nav.tsx`): add the same footer block at the bottom of the `SheetContent`, closing the sheet (`setOpen(false)`) before navigating.
- The header dropdown (`UserMenu`) is unchanged — both logout entry points remain.
- To avoid duplicating the logout logic, extract a tiny shared helper `useLogout()` hook in `frontend/src/hooks/use-logout.ts` returning a `logout()` callback that both `UserMenu`, `AppSidebar`, and `MobileNav` call.

## 3. Google profile photo

**Backend (`backend/src/controllers/auth.controller.js`):**

- In `googleLogin`, destructure `picture` from the verified Google payload alongside `sub`/`email`/`email_verified`.
- When the admin is found by `googleId` already: no change (do not touch `avatarUrl` on every login).
- When linking Google to an existing admin found by email (first-time Google link): if `admin.avatarUrl` is falsy, pass `picture` through to `linkGoogleId` so it's persisted; otherwise leave the existing `avatarUrl` untouched.

**Backend (`backend/src/repositories/admin.repository.js`):**

- `linkGoogleId(id, googleId, avatarUrl)` — extend to optionally include `avatarUrl` in the `data` object of the `prisma.admin.update` call, only when a non-empty `avatarUrl` is passed in.

**Frontend:** no changes required. `UserMenu`, `AvatarUpload`, and the new sidebar footer all already render `AvatarImage` with `AvatarFallback` (initials) when `avatarUrl` is null — this already satisfies "use initials if never logged in with Google, use the Google photo if available." The existing `ProfileForm` + `AvatarUpload` + `updateMe` flow already lets the user replace the photo at any time, and since the backend only auto-fills when `avatarUrl` is empty, a manual upload permanently takes precedence over future Google logins.

## 4. Branding: "Bumdes Sumber Abadi Desa Besuki"

Added as static text (Indonesian, muted styling) in:

- `AppSidebar` — small `<p>` subtitle under the "Recording Ternak" title.
- `MobileNav` — same subtitle under the `SheetTitle`.
- `app/page.tsx` (login page) — added under the existing "Masuk untuk mengelola data recording ternak" subtitle.
- `DashboardHeader` — small muted text on the left side, `hidden md:block` (desktop only, to avoid crowding the mobile header which already has the hamburger + user menu).

Exact copy: "Layanan oleh Bumdes Sumber Abadi Desa Besuki".

## Testing

- Existing Jest backend tests for `auth.controller.js` / `admin.repository.js` (`googleLogin`, `linkGoogleId`) updated/extended to cover: avatarUrl set when empty, avatarUrl untouched when already present, avatarUrl untouched on subsequent (already-linked) logins.
- No new frontend automated tests are required by existing project convention (no frontend test suite currently present for pages/components of this kind), but manual verification is required per project instructions before marking complete: run `npm run dev` in `frontend`, exercise sort on each of the 4 tables, sidebar/mobile logout, and visually confirm branding text placement.

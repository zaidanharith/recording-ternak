# Sidebar Logout, Table Sort, Google Avatar & Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sidebar logout button, client-side column sorting on all 4 data tables, auto-populated Google profile photos (without clobbering manual uploads), and "Bumdes Sumber Abadi Desa Besuki" branding text across the dashboard shell and login page.

**Architecture:** Frontend-only for sorting/logout/branding (new hook + presentational component reused across 4 existing table pages, plus edits to 3 layout components and the login page). One backend controller/repository change for the Google avatar auto-fill, covered by Jest unit tests following the existing mock-based test pattern in `backend/src/controllers/__tests__/auth.controller.test.js`.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, shadcn/ui (`Table`, `Button`, `Avatar`, `Sheet`), react-icons (`Fi*`), Zustand (`useAuthStore`), Express + Prisma backend, Jest.

## Global Constraints

- Sorting is client-side only — it reorders whatever page of rows is currently loaded; no backend query params are added for sort.
- Sort cycles per column: ascending → descending → unsorted (original order), and clicking a different column resets to ascending on that column.
- Strings sort via `localeCompare` with `"id-ID"` locale; `null`/`undefined` values always sort to the end regardless of direction.
- Backend must only auto-fill `avatarUrl` from Google's `picture` claim when the admin's existing `avatarUrl` is falsy (empty/null) — never overwrite a manually-set photo, and never re-fetch/update it on subsequent logins once linked.
- Branding copy, verbatim: `Layanan oleh Bumdes Sumber Abadi Desa Besuki`.
- All existing UI copy is Indonesian — new copy must match (e.g. "Keluar" for logout, not "Logout").
- Action columns (edit/delete) and the Recording table's photo column are never sortable.

---

### Task 1: `useSortableData` hook

**Files:**
- Create: `frontend/src/hooks/use-sortable-data.ts`

**Interfaces:**
- Produces: `useSortableData<T>(data: T[], accessors: Record<string, (item: T) => string | number | null | undefined>): { sortedData: T[]; sortKey: string | null; sortDirection: "asc" | "desc" | null; toggleSort: (key: string) => void }`
  - Later tasks (2, 3) call this exact signature.

- [ ] **Step 1: Write the hook**

```typescript
"use client";

import { useMemo, useState } from "react";

type SortDirection = "asc" | "desc" | null;
type Accessor<T> = (item: T) => string | number | null | undefined;

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: "asc" | "desc",
): number {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  let result: number;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b), "id-ID");
  }

  return direction === "asc" ? result : -result;
}

export function useSortableData<T>(
  data: T[],
  accessors: Record<string, Accessor<T>>,
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
      return;
    }

    setSortDirection("asc");
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    const accessor = accessors[sortKey];
    if (!accessor) return data;

    return [...data].sort((itemA, itemB) =>
      compareValues(accessor(itemA), accessor(itemB), sortDirection),
    );
  }, [data, sortKey, sortDirection, accessors]);

  return { sortedData, sortKey, sortDirection, toggleSort };
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors referencing `use-sortable-data.ts`

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/hooks/use-sortable-data.ts
git commit -m "feat(frontend): add useSortableData hook for client-side table sort

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `SortableTableHead` component

**Files:**
- Create: `frontend/src/components/common/sortable-table-head.tsx`

**Interfaces:**
- Consumes: `TableHead` from `@/components/ui/table` (props: standard `th` props via `React.ComponentProps<"th">`).
- Produces: `SortableTableHead` component, props `{ sortKey: string; currentKey: string | null; currentDirection: "asc" | "desc" | null; onSort: (key: string) => void; className?: string; children: React.ReactNode }`. Tasks 3–6 render this in place of `TableHead` for sortable columns.

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  sortKey: string;
  currentKey: string | null;
  currentDirection: "asc" | "desc" | null;
  onSort: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function SortableTableHead({
  sortKey,
  currentKey,
  currentDirection,
  onSort,
  className,
  children,
}: SortableTableHeadProps) {
  const isActive = currentKey === sortKey;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-left font-medium text-foreground"
      >
        {children}
        <span className="flex flex-col -space-y-1">
          <FiChevronUp
            className={cn(
              "size-3",
              isActive && currentDirection === "asc"
                ? "text-foreground"
                : "text-muted-foreground/40",
            )}
          />
          <FiChevronDown
            className={cn(
              "size-3",
              isActive && currentDirection === "desc"
                ? "text-foreground"
                : "text-muted-foreground/40",
            )}
          />
        </span>
      </button>
    </TableHead>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors referencing `sortable-table-head.tsx`

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/common/sortable-table-head.tsx
git commit -m "feat(frontend): add SortableTableHead component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Wire sorting into Peternak and Kambing tables

**Files:**
- Modify: `frontend/src/app/(dashboard)/peternak/page.tsx`
- Modify: `frontend/src/app/(dashboard)/kambing/page.tsx`

**Interfaces:**
- Consumes: `useSortableData` (Task 1), `SortableTableHead` (Task 2).

- [ ] **Step 1: Update `peternak/page.tsx`**

Add the import and hook call, replace the static `TableHead`s for Nama/Nomor WhatsApp/Alamat with `SortableTableHead`, and map over `sortedData` instead of `data.farmers`.

Add imports near the top (alongside existing imports):

```typescript
import { SortableTableHead } from "@/components/common/sortable-table-head";
import { useSortableData } from "@/hooks/use-sortable-data";
```

Inside `PeternakPage`, after `const { data, isLoading, refetch } = useAsync(fetcher);`, add:

```typescript
  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    data?.farmers ?? [],
    {
      name: (farmer) => farmer.name,
      whatsappPhone: (farmer) => farmer.whatsappPhone,
      address: (farmer) => farmer.address,
    },
  );
```

Replace the `TableHeader` block:

```typescript
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="name"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Nama
                </SortableTableHead>
                <SortableTableHead
                  sortKey="whatsappPhone"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Nomor WhatsApp
                </SortableTableHead>
                <SortableTableHead
                  sortKey="address"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Alamat
                </SortableTableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
```

Replace `{data.farmers.map((farmer) => (` with `{sortedData.map((farmer) => (`.

- [ ] **Step 2: Update `kambing/page.tsx`**

Add the same imports. Inside `KambingPageContent`, after `const { data, isLoading, refetch } = useAsync(fetcher);`, add:

```typescript
  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    data?.goats ?? [],
    {
      earTagNumber: (goat) => goat.earTagNumber,
      farmer: (goat) => goat.farmer?.name,
      createdAt: (goat) => goat.createdAt,
    },
  );
```

Replace the `TableHeader` block:

```typescript
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="earTagNumber"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  No. Telinga
                </SortableTableHead>
                <SortableTableHead
                  sortKey="farmer"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Peternak
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Terdaftar
                </SortableTableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
```

Replace `{data.goats.map((goat) => (` with `{sortedData.map((goat) => (`. Note `filterLabel` still reads `data?.goats[0]?.farmer?.name` — leave that line as-is (it reads from the original `data`, not sorted data, which is fine since it only needs any matching row).

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`
Visit `/peternak` and `/kambing`, click each sortable column header 3 times (asc → desc → unsorted), confirm row order changes correctly and the chevron indicator reflects the active column/direction.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/app/\(dashboard\)/peternak/page.tsx src/app/\(dashboard\)/kambing/page.tsx
git commit -m "feat(frontend): add column sorting to Peternak and Kambing tables

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Wire sorting into Recording and Kelola Akun tables

**Files:**
- Modify: `frontend/src/app/(dashboard)/recording/page.tsx`
- Modify: `frontend/src/app/(dashboard)/pengaturan/akun/page.tsx`

**Interfaces:**
- Consumes: `useSortableData` (Task 1), `SortableTableHead` (Task 2).

- [ ] **Step 1: Update `recording/page.tsx`**

Add the same two imports as Task 3. Inside `RecordingPageContent`, after `const { data, isLoading, refetch } = useAsync(fetcher);`, add:

```typescript
  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    data?.recordings ?? [],
    {
      goat: (recording) => recording.goat?.earTagNumber,
      farmer: (recording) => recording.goat?.farmer?.name,
      birthDate: (recording) => recording.birthDate,
      source: (recording) => recording.source,
      status: (recording) => recording.status,
    },
  );
```

Replace the `TableHeader` block:

```typescript
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <SortableTableHead
                  sortKey="goat"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Kambing
                </SortableTableHead>
                <SortableTableHead
                  sortKey="farmer"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Peternak
                </SortableTableHead>
                <SortableTableHead
                  sortKey="birthDate"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Tanggal Lahir
                </SortableTableHead>
                <TableHead>Anak (J/B)</TableHead>
                <SortableTableHead
                  sortKey="source"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Sumber
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
```

Replace `{data.recordings.map((recording) => (` with `{sortedData.map((recording) => (`.

- [ ] **Step 2: Update `pengaturan/akun/page.tsx`**

Add the same two imports. Inside `AkunContent`, after `const { data: admins, isLoading, refetch } = useAsync(fetcher);`, add:

```typescript
  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    admins ?? [],
    {
      name: (admin) => admin.name,
      username: (admin) => admin.username,
      email: (admin) => admin.email,
      role: (admin) => admin.role,
    },
  );
```

Replace the `TableHeader` block:

```typescript
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                sortKey="name"
                currentKey={sortKey}
                currentDirection={sortDirection}
                onSort={toggleSort}
              >
                Nama
              </SortableTableHead>
              <SortableTableHead
                sortKey="username"
                currentKey={sortKey}
                currentDirection={sortDirection}
                onSort={toggleSort}
              >
                Username
              </SortableTableHead>
              <SortableTableHead
                sortKey="email"
                currentKey={sortKey}
                currentDirection={sortDirection}
                onSort={toggleSort}
              >
                Email
              </SortableTableHead>
              <SortableTableHead
                sortKey="role"
                currentKey={sortKey}
                currentDirection={sortDirection}
                onSort={toggleSort}
              >
                Role
              </SortableTableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((admin) => (
```

(Only the `TableHeader` and the `admins.map` → `sortedData.map` line change; the rest of `TableBody` stays as-is. Also update the closing `))}` context is unaffected — just the opening map line and the `!admins || admins.length === 0` empty-check stays reading `admins`, not `sortedData`.)

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`
Visit `/recording` and `/pengaturan/akun`, click each sortable column header 3 times, confirm correct reordering and chevron state. On Recording, confirm the "Foto" and "Anak (J/B)" columns have no sort control.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/app/\(dashboard\)/recording/page.tsx src/app/\(dashboard\)/pengaturan/akun/page.tsx
git commit -m "feat(frontend): add column sorting to Recording and Kelola Akun tables

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Shared `useLogout` hook

**Files:**
- Create: `frontend/src/hooks/use-logout.ts`
- Modify: `frontend/src/components/layout/user-menu.tsx`

**Interfaces:**
- Produces: `useLogout(): () => void` — calls `useAuthStore().logout()` then `router.replace("/")`. Tasks 6 and 7 call this same hook.

- [ ] **Step 1: Write the hook**

```typescript
"use client";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    router.replace("/");
  };
}
```

- [ ] **Step 2: Refactor `user-menu.tsx` to use it**

In `frontend/src/components/layout/user-menu.tsx`, replace:

```typescript
import { useRouter } from "next/navigation";
```

with:

```typescript
import { useLogout } from "@/hooks/use-logout";
```

Replace:

```typescript
export function UserMenu() {
  const router = useRouter();
  const admin = useAuthStore((state) => state.admin);
  const logout = useAuthStore((state) => state.logout);

  if (!admin) return null;

  const handleLogout = () => {
    logout();
    router.replace("/");
  };
```

with:

```typescript
export function UserMenu() {
  const admin = useAuthStore((state) => state.admin);
  const handleLogout = useLogout();

  if (!admin) return null;
```

`router.push(...)` calls elsewhere in the file still need `useRouter` — check the file: it uses `router.push("/pengaturan")` and `router.push("/pengaturan/akun")`, so keep `useRouter` imported too:

```typescript
import { useRouter } from "next/navigation";
import { useLogout } from "@/hooks/use-logout";
```

and inside the component:

```typescript
export function UserMenu() {
  const router = useRouter();
  const admin = useAuthStore((state) => state.admin);
  const handleLogout = useLogout();

  if (!admin) return null;
```

(Keep the rest of the file — the `DropdownMenuItem onClick={handleLogout}` call — unchanged.)

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`, log in, click the header user menu → "Keluar", confirm redirect to `/` and that the auth store is cleared (refreshing shows the login form).

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/hooks/use-logout.ts src/components/layout/user-menu.tsx
git commit -m "refactor(frontend): extract shared useLogout hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Sidebar and mobile-nav logout footer + branding text

**Files:**
- Modify: `frontend/src/components/layout/app-sidebar.tsx`
- Modify: `frontend/src/components/layout/mobile-nav.tsx`

**Interfaces:**
- Consumes: `useLogout` (Task 5), `useAuthStore` (existing).

- [ ] **Step 1: Update `app-sidebar.tsx`**

Replace the full file contents:

```typescript
"use client";

import { FiLogOut } from "react-icons/fi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useLogout } from "@/hooks/use-logout";
import { useAuthStore } from "@/stores/auth.store";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const admin = useAuthStore((state) => state.admin);
  const handleLogout = useLogout();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar p-4 md:flex md:flex-col">
      <div className="mb-6 px-2">
        <span className="text-lg font-semibold text-sidebar-foreground">
          Recording Ternak
        </span>
        <p className="text-xs text-muted-foreground">
          Layanan oleh Bumdes Sumber Abadi Desa Besuki
        </p>
      </div>
      <SidebarNav role={admin?.role} />

      {admin && (
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 px-2">
            <Avatar className="size-8">
              <AvatarImage src={admin.avatarUrl ?? undefined} alt={admin.name} />
              <AvatarFallback>{initials(admin.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {admin.name}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={handleLogout}
          >
            <FiLogOut className="size-4" />
            Keluar
          </Button>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Update `mobile-nav.tsx`**

Replace the full file contents:

```typescript
"use client";

import { useState } from "react";
import { FiLogOut, FiMenu } from "react-icons/fi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useLogout } from "@/hooks/use-logout";
import { useAuthStore } from "@/stores/auth.store";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const admin = useAuthStore((state) => state.admin);
  const handleLogout = useLogout();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Buka menu" className="md:hidden">
            <FiMenu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-64 flex-col p-4">
        <SheetHeader className="px-0">
          <SheetTitle>Recording Ternak</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Layanan oleh Bumdes Sumber Abadi Desa Besuki
          </p>
        </SheetHeader>
        <div className="mt-4 flex-1">
          <SidebarNav role={admin?.role} onNavigate={() => setOpen(false)} />
        </div>

        {admin && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 px-2">
              <Avatar className="size-8">
                <AvatarImage src={admin.avatarUrl ?? undefined} alt={admin.name} />
                <AvatarFallback>{initials(admin.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{admin.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
            >
              <FiLogOut className="size-4" />
              Keluar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`. On desktop width, confirm the sidebar shows the branding subtitle and a bottom "Keluar" button that logs out and redirects to `/`. Shrink to mobile width, open the hamburger menu, confirm the same subtitle + footer with logout appears in the sheet and closes the sheet before redirecting.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/components/layout/app-sidebar.tsx src/components/layout/mobile-nav.tsx
git commit -m "feat(frontend): add sidebar/mobile-nav logout footer and branding text

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Branding text on login page and dashboard header

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/layout/dashboard-header.tsx`

**Interfaces:**
- None (leaf UI changes).

- [ ] **Step 1: Update `app/page.tsx`**

Replace:

```typescript
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Recording Ternak
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk mengelola data recording ternak
          </p>
        </div>
```

with:

```typescript
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Recording Ternak
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk mengelola data recording ternak
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Layanan oleh Bumdes Sumber Abadi Desa Besuki
          </p>
        </div>
```

- [ ] **Step 2: Update `dashboard-header.tsx`**

Replace the full file contents:

```typescript
"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export function DashboardHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <MobileNav />
      <p className="hidden text-xs text-muted-foreground md:block">
        Layanan oleh Bumdes Sumber Abadi Desa Besuki
      </p>
      <div className="flex-1" />
      <UserMenu />
    </header>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`. Visit `/` (login) and confirm the branding line appears under the subtitle. Log in and confirm the dashboard header shows the branding text on desktop widths and hides it on mobile widths (viewport < 768px).

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/app/page.tsx src/components/layout/dashboard-header.tsx
git commit -m "feat(frontend): add branding text to login page and dashboard header

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Backend — auto-fill avatarUrl from Google profile photo

**Files:**
- Modify: `backend/src/repositories/admin.repository.js`
- Modify: `backend/src/controllers/auth.controller.js`
- Modify: `backend/src/repositories/__tests__/admin.repository.test.js`
- Modify: `backend/src/controllers/__tests__/auth.controller.test.js`

**Interfaces:**
- Produces: `adminRepository.linkGoogleId(id: string, googleId: string, avatarUrl?: string | null): Promise<Admin>` — when `avatarUrl` is a non-empty string, it's included in the Prisma update `data`; otherwise only `googleId` is updated.

- [ ] **Step 1: Read existing repository test file for pattern**

Read `backend/src/repositories/__tests__/admin.repository.test.js` to confirm the mocking pattern used for `prisma.admin.update` before writing new assertions (the file already has a `linkGoogleId` describe block referenced in the earlier grep — locate it and extend in place rather than duplicating).

- [ ] **Step 2: Write failing tests for `linkGoogleId`**

In `backend/src/repositories/__tests__/admin.repository.test.js`, add (inside the existing `describe('linkGoogleId'` block if present, otherwise add a new one):

```javascript
describe('linkGoogleId', () => {
  it('updates only googleId when avatarUrl is not provided', async () => {
    prisma.admin.update.mockResolvedValue({ id: 'admin-1', googleId: 'g-1' });

    await adminRepository.linkGoogleId('admin-1', 'g-1');

    expect(prisma.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { googleId: 'g-1' },
    });
  });

  it('includes avatarUrl in the update when provided', async () => {
    prisma.admin.update.mockResolvedValue({ id: 'admin-1', googleId: 'g-1', avatarUrl: 'https://pic.example/a.png' });

    await adminRepository.linkGoogleId('admin-1', 'g-1', 'https://pic.example/a.png');

    expect(prisma.admin.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { googleId: 'g-1', avatarUrl: 'https://pic.example/a.png' },
    });
  });
});
```

(If `prisma` is mocked via a module mock in this file, follow the exact import/mock pattern already present for other functions like `updateAdmin` — check the top of the existing test file for how `prisma` is required/mocked and reuse it verbatim.)

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `cd backend && npx jest admin.repository.test.js -t linkGoogleId`
Expected: FAIL — `linkGoogleId` currently only accepts `(id, googleId)` and always sends `data: { googleId }`, so the second test's assertion on `avatarUrl` will fail.

- [ ] **Step 4: Implement `linkGoogleId` avatarUrl support**

In `backend/src/repositories/admin.repository.js`, replace:

```javascript
const linkGoogleId = async (id, googleId) => {
  return await prisma.admin.update({ where: { id }, data: { googleId } });
};
```

with:

```javascript
const linkGoogleId = async (id, googleId, avatarUrl) => {
  const data = { googleId };
  if (avatarUrl) data.avatarUrl = avatarUrl;
  return await prisma.admin.update({ where: { id }, data });
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npx jest admin.repository.test.js`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 6: Write failing tests for `googleLogin` avatar auto-fill**

In `backend/src/controllers/__tests__/auth.controller.test.js`, first add `googleLogin` to the destructured import at the top:

```javascript
const { login, googleLogin, me, updateMe } = require('../auth.controller');
```

Then add a new `describe` block (the file currently has no `googleLogin` tests — this is new). Mock the Google client's `verifyIdToken` via the module-level mock already set up (`jest.mock('google-auth-library', ...)`), which needs access to the mock instance. Since the current mock factory creates an anonymous inline mock, capture it by requiring the mocked module directly:

```javascript
const { OAuth2Client } = require('google-auth-library');

describe('googleLogin', () => {
  const buildTicket = (payload) => ({ getPayload: () => payload });

  it('links Google account and sets avatarUrl when admin has none yet', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue(
      buildTicket({
        sub: 'g-1',
        email: 'budi@example.com',
        email_verified: true,
        picture: 'https://pic.example/budi.png',
      }),
    );
    OAuth2Client.mockImplementation(() => ({ verifyIdToken }));

    adminRepository.findAdminByGoogleId.mockResolvedValue(null);
    adminRepository.findAdminByEmail.mockResolvedValue({
      id: 'admin-1', email: 'budi@example.com', name: 'Budi', role: 'ADMIN', avatarUrl: null,
    });
    adminRepository.linkGoogleId.mockResolvedValue({
      id: 'admin-1', email: 'budi@example.com', name: 'Budi', role: 'ADMIN', avatarUrl: 'https://pic.example/budi.png', googleId: 'g-1',
    });
    authService.generateToken.mockReturnValue('signed.jwt.token');

    const req = { body: { idToken: 'valid-token' } };
    const res = buildRes();

    await googleLogin(req, res);

    expect(adminRepository.linkGoogleId).toHaveBeenCalledWith('admin-1', 'g-1', 'https://pic.example/budi.png');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not overwrite an existing avatarUrl when linking Google', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue(
      buildTicket({
        sub: 'g-2',
        email: 'siti@example.com',
        email_verified: true,
        picture: 'https://pic.example/siti-google.png',
      }),
    );
    OAuth2Client.mockImplementation(() => ({ verifyIdToken }));

    adminRepository.findAdminByGoogleId.mockResolvedValue(null);
    adminRepository.findAdminByEmail.mockResolvedValue({
      id: 'admin-2', email: 'siti@example.com', name: 'Siti', role: 'ADMIN', avatarUrl: 'https://pic.example/siti-manual.png',
    });
    adminRepository.linkGoogleId.mockResolvedValue({
      id: 'admin-2', email: 'siti@example.com', name: 'Siti', role: 'ADMIN', avatarUrl: 'https://pic.example/siti-manual.png', googleId: 'g-2',
    });
    authService.generateToken.mockReturnValue('signed.jwt.token');

    const req = { body: { idToken: 'valid-token' } };
    const res = buildRes();

    await googleLogin(req, res);

    expect(adminRepository.linkGoogleId).toHaveBeenCalledWith('admin-2', 'g-2', undefined);
  });

  it('does not call linkGoogleId when the admin is already linked', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue(
      buildTicket({ sub: 'g-3', email: 'existing@example.com', email_verified: true, picture: 'https://pic.example/x.png' }),
    );
    OAuth2Client.mockImplementation(() => ({ verifyIdToken }));

    adminRepository.findAdminByGoogleId.mockResolvedValue({
      id: 'admin-3', email: 'existing@example.com', name: 'Existing', role: 'ADMIN', avatarUrl: null, googleId: 'g-3',
    });
    authService.generateToken.mockReturnValue('signed.jwt.token');

    const req = { body: { idToken: 'valid-token' } };
    const res = buildRes();

    await googleLogin(req, res);

    expect(adminRepository.linkGoogleId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 7: Run the new tests to verify they fail**

Run: `cd backend && npx jest auth.controller.test.js -t googleLogin`
Expected: FAIL — `auth.controller.js` currently calls `adminRepository.linkGoogleId(admin.id, googleId)` with no third argument and never reads `picture` from the payload, so the first two assertions on the third argument will fail (test 3 should already pass since `linkGoogleId` is correctly never called in that path).

- [ ] **Step 8: Implement the avatar auto-fill in `googleLogin`**

In `backend/src/controllers/auth.controller.js`, replace:

```javascript
    const { sub: googleId, email, email_verified: emailVerified } = payload;
```

with:

```javascript
    const { sub: googleId, email, email_verified: emailVerified, picture } = payload;
```

Replace:

```javascript
      admin = await adminRepository.linkGoogleId(admin.id, googleId);
```

with:

```javascript
      const avatarToSet = admin.avatarUrl ? undefined : picture;
      admin = await adminRepository.linkGoogleId(admin.id, googleId, avatarToSet);
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cd backend && npx jest auth.controller.test.js`
Expected: PASS (all tests, including the three new ones)

- [ ] **Step 10: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS, no regressions in other suites

- [ ] **Step 11: Commit**

```bash
cd backend
git add src/repositories/admin.repository.js src/controllers/auth.controller.js src/repositories/__tests__/admin.repository.test.js src/controllers/__tests__/auth.controller.test.js
git commit -m "feat(backend): auto-fill admin avatarUrl from Google profile photo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Final full-stack verification

**Files:** none (verification only)

- [ ] **Step 1: Backend tests**

Run: `cd backend && npm test`
Expected: all suites pass

- [ ] **Step 2: Frontend type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 3: Manual end-to-end pass**

Run: `cd frontend && npm run dev` (and `cd backend && npm run dev` in a second terminal, with a valid `.env`). In the browser:
1. Confirm the login page shows the branding line.
2. Log in with an email/password admin. Confirm sidebar shows branding subtitle, avatar+name+"Keluar" footer, and dashboard header shows branding text on desktop.
3. On each of Peternak, Kambing, Recording, and Kelola Akun (as SUPERADMIN), click through sortable columns and confirm correct 3-state cycling.
4. Click "Keluar" from the sidebar footer, confirm redirect to `/` and that the session is cleared.
5. Reopen mobile width, open the hamburger sheet, confirm branding + logout footer works there too and closes the sheet on logout.
6. If a Google-linked test account is available: verify a first-time Google login on an admin with no `avatarUrl` picks up the Google photo, and that manually uploading a different photo via `/pengaturan` afterward is not overwritten by a subsequent Google login.

- [ ] **Step 4: Report completion**

No commit for this task — it's verification only. Summarize results to the user.

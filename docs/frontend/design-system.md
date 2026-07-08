# Design System

Tailwind CSS v4 (`@theme` directive) + shadcn/ui, themed around a green/earth-tone "farm" palette. Tokens live in `frontend/src/styles/globals.css`.

## Brand tokens

| Token | Value | Use |
|---|---|---|
| `--color-brand-bg` | `#f8f5f0` | Page background |
| `--color-brand-main` | `#2e7d32` | Primary green |
| `--color-brand-light` | `#c8e6c9` | Accent/hover surfaces |
| `--color-brand-dark` | `#1b5e20` | Emphasis/active states |

## shadcn semantic tokens (`:root`)

| Token | Value | Notes |
|---|---|---|
| `--background` / `--foreground` | `#f8f5f0` / `#3e2723` | Warm off-white on dark brown text |
| `--primary` / `--primary-foreground` | `#2e7d32` / `#ffffff` | Primary buttons, active nav |
| `--secondary` / `--secondary-foreground` | `#e8f5e9` / `#1b5e20` | Secondary buttons, badges |
| `--muted` / `--muted-foreground` | `#f0e9e0` / `#6d4c41` | Disabled/subdued text, placeholders |
| `--accent` / `--accent-foreground` | `#c8e6c9` / `#1b5e20` | Hover states |
| `--destructive` | `#f4212e` | Delete actions, error text |
| `--border` / `--input` | `#e0d6c9` | Dividers, form field borders |
| `--chart-1`..`--chart-5` | shades of green, `#4caf50` → `#0a1f0c` | Recharts series colors |
| `--sidebar*` | derived from `--muted`/`--primary` | Sidebar-specific surface/text/accent |

Dark mode is enabled via the `dark` class variant (`@custom-variant dark (&:is(.dark *))`) but token overrides for it should be checked in `globals.css` before assuming dark mode is fully themed — verify current values there before styling new components for dark mode.

## Typography

Single font family: Google Font **Noto Sans**, loaded via `next/font/google` in `app/layout.tsx` and exposed as the `--font-sans` CSS variable. No separate heading font (`--font-heading` aliases to `--font-sans`).

## Component conventions

- All low-level primitives (`button`, `dialog`, `table`, `select`, `form`, ...) live under `src/components/ui/` — these are shadcn-generated, keep edits minimal and prefer composing over rewriting.
- Cross-feature composites (`PageHeader`, `EmptyState`, `ConfirmDialog`, `PaginationBar`, `RouteGuard`, `RoleGuard`) live in `src/components/common/`.
- Domain-specific components (forms, selects, badges tied to a specific resource) live under `src/features/<domain>/components/`, e.g. `src/features/recordings/components/recording-form-dialog.tsx`.
- Icons: `react-icons/fi` (Feather icon set) throughout, e.g. `nav-items.ts`.

# Folder Structure

```
recording-ternak/
├── backend/                        Node.js + Express serverless API
│   ├── prisma/
│   │   ├── schema.prisma           Data model (see database-schema.md)
│   │   └── migrations/             Prisma migration history
│   ├── src/
│   │   ├── config/index.js         Central config: env vars, Gemini models, Sheets column schema
│   │   ├── controllers/            Request handlers — validation + response shaping, no DB access
│   │   ├── services/                Business logic: Gemini calls, WhatsApp API, Sheets sync, Cloudinary, sessions
│   │   ├── repositories/           Prisma queries only — the sole layer that touches `prisma.*`
│   │   ├── middlewares/            auth (JWT), role (RBAC), upload (multer)
│   │   ├── routes/                 One file per resource, mounted under /api in routes/api.js
│   │   ├── lib/prisma.js           Shared PrismaClient instance
│   │   └── server.js               Express app entrypoint
│   ├── vercel.json                 Rewrites all routes to src/server.js for serverless deployment
│   └── package.json
│
├── frontend/                       Next.js 16 (App Router) + shadcn/ui dashboard
│   └── src/
│       ├── app/
│       │   ├── page.tsx            Login page
│       │   ├── layout.tsx          Root layout (fonts, providers)
│       │   └── (dashboard)/        Route group — all authenticated pages, wrapped by RouteGuard
│       │       ├── layout.tsx      Sidebar + header shell
│       │       ├── dashboard/      Summary, charts, alerts
│       │       ├── peternak/       Farmers list + detail (chat history, reminder)
│       │       ├── kambing/        Goats
│       │       ├── recording/      Health records
│       │       ├── follow-up/      Farmers who haven't reported recently
│       │       └── pengaturan/     Settings: admin accounts, own profile/account
│       ├── features/               Feature-scoped components, grouped by domain
│       │   ├── admins/ auth/ chat/ dashboard/ farmers/ goats/ profile/ recordings/
│       ├── components/
│       │   ├── ui/                 shadcn/ui primitives (button, dialog, table, ...)
│       │   ├── common/             Cross-feature helpers: RouteGuard, RoleGuard, PageHeader, ConfirmDialog, ...
│       │   └── layout/              Sidebar, header, mobile nav
│       ├── services/                One Axios wrapper module per API resource
│       ├── stores/auth.store.ts    Zustand store: token + admin, persisted to localStorage
│       ├── lib/                    axios instance, rbac helpers, zod validation schemas, cn() util
│       ├── hooks/                  use-async, use-debounce, use-mobile
│       └── types/                  Shared TypeScript types, mirroring backend response shapes
│
├── docs/                           This documentation
└── CLAUDE.md                       Instructions for AI coding agents working in this repo
```

## Layering rules (backend)

`routes` → `controllers` → `services`/`repositories`. Controllers never call `prisma` directly; only `repositories/*.js` do. Cross-cutting concerns (parsing, WhatsApp delivery, Sheets sync, Cloudinary) live in `services/*.js` and are composed by `recording.service.js`, the orchestrator for the WhatsApp flow.

## Layering rules (frontend)

Pages under `app/(dashboard)/**/page.tsx` compose `features/**/components` and call `services/*.ts` (Axios wrappers) for data. `stores/auth.store.ts` is the single source of truth for the logged-in admin and JWT; `lib/rbac.ts` gates UI by role, `components/common/route-guard.tsx` gates entire routes.

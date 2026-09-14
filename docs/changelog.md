# Changelog

## 2026-09-14 — Integration with dashboard-kematian-ternak

- Merged users: dashboard-kematian-ternak dropped its own `User` model — `Admin` here is now the shared users table for both apps, its auth/user-management endpoints proxy to `/api/auth/*`/`/api/admins`. Google Sign-In now accepts either app's OAuth Client ID as a valid audience.
- Bidirectional Farmer ↔ Peternak sync: every create/update/delete here is pushed to dashboard's `Peternak` table (same row id), and vice versa, via new `/internal/*` endpoints (`INTERNAL_API_KEY` guarded).
- New `POST /api/kematian/goats/:goatId/generate` and `POST /api/kelahiran/goats/:goatId/generate`: provision the goat as a Ternak (always jenis `"Kambing"`) in dashboard's database, create the death/birth report, and return the generated berita acara / akta kelahiran document — no document generation logic duplicated here.
- New `Laporan Kematian` and `Laporan Kelahiran` management pages: list, view, edit, delete, and re-download documents for every Kambing report, proxied to dashboard's API.
- See [ADR-006](decisions/adr-006-integration-with-dashboard-kematian-ternak.md), [`api/kematian.md`](api/kematian.md), [`api/kelahiran.md`](api/kelahiran.md), [`api/internal.md`](api/internal.md).

## 2026-07-08

Initial documentation snapshot of the Recording Ternak system as of this date. Notable state at time of writing:

- Backend: Express serverless API on Vercel, Prisma + PostgreSQL (Supabase), WhatsApp Cloud API webhook with Gemini-powered free-form Indonesian text parsing, Google Sheets sync with automatic consistency self-healing, Cloudinary photo storage, JWT + Google OAuth dashboard auth with `ADMIN`/`SUPERADMIN`/`VIEWER` roles.
- Recent backend work: WhatsApp image message handling (photo upload to Cloudinary, attaching photos to in-progress or newly created recordings), orphaned Cloudinary upload cleanup when photos are replaced or recordings deleted.
- Frontend: Next.js 16 App Router dashboard with shadcn/ui, covering farmers, goats, recordings, follow-up reminders, dashboard summary/charts, and admin account management.
- No seed script exists yet; the first `SUPERADMIN` account must be created manually (see [`setup/installation.md`](setup/installation.md#frontend-first-run)).

See [`docs/decisions/`](decisions/) for the architectural decisions behind this state.

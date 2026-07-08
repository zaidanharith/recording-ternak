# Changelog

## 2026-07-08

Initial documentation snapshot of the Recording Ternak system as of this date. Notable state at time of writing:

- Backend: Express serverless API on Vercel, Prisma + PostgreSQL (Supabase), WhatsApp Cloud API webhook with Gemini-powered free-form Indonesian text parsing, Google Sheets sync with automatic consistency self-healing, Cloudinary photo storage, JWT + Google OAuth dashboard auth with `ADMIN`/`SUPERADMIN`/`VIEWER` roles.
- Recent backend work: WhatsApp image message handling (photo upload to Cloudinary, attaching photos to in-progress or newly created recordings), orphaned Cloudinary upload cleanup when photos are replaced or recordings deleted.
- Frontend: Next.js 16 App Router dashboard with shadcn/ui, covering farmers, goats, recordings, follow-up reminders, dashboard summary/charts, and admin account management.
- No seed script exists yet; the first `SUPERADMIN` account must be created manually (see [`setup/installation.md`](setup/installation.md#frontend-first-run)).

See [`docs/decisions/`](decisions/) for the architectural decisions behind this state.

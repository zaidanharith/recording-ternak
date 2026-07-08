# Deployment

Both `backend/` and `frontend/` deploy as separate Vercel projects from the same monorepo.

## Backend

- `backend/vercel.json` rewrites every path to `src/server.js`, so the whole Express app runs as a single serverless function:
  ```json
  { "version": 2, "rewrites": [{ "source": "/(.*)", "destination": "/src/server.js" }] }
  ```
- Set every variable from [`environment.md`](environment.md) in the Vercel project's Environment Variables settings — `.env` files are not deployed.
- Set `GOOGLE_CREDENTIALS` (the full service-account JSON as a single-line string) rather than relying on a `google-credentials.json` file, since only committed files ship with the deployment and credentials should not be committed.
- `postinstall` runs `prisma generate` automatically on Vercel's build.
- Because the backend is serverless (no long-lived process), conversation state cannot live in memory — it's persisted to the `session` table instead (see [`system-design.md`](../architecture/system-design.md#conversation-state-machine)). Keep this in mind if you ever consider moving state back to an in-process cache.
- After deploying, update the WhatsApp webhook Callback URL in Meta's dashboard to `https://<your-backend>.vercel.app/api/webhook` and re-verify.

## Frontend

- Standard Next.js Vercel deployment (`npm run build`).
- Set `NEXT_PUBLIC_API_URL` to the deployed backend's `/api` URL.
- `next.config.ts` allow-lists `res.cloudinary.com` and `lh3.googleusercontent.com` as remote image hosts (`next/image`) — add any new external image host here if you introduce one.

## Database

Migrations are applied against `DIRECT_URL` (bypasses the connection pooler), not `DATABASE_URL`. Run `npm run db:migrate` (or `prisma migrate deploy` in CI) against the target environment before deploying backend code that depends on a new schema — see [`database/migration.md`](../database/migration.md).

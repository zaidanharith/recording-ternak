# Environment Variables

All backend configuration is loaded via `dotenv` in `backend/src/server.js` / `backend/src/config/index.js`. Never commit real values — `backend/.env.example` lists every key with placeholders.

| Variable | Used for | Where to get it |
|---|---|---|
| `PORT` | Local dev server port (default `5000`) | — |
| `GEMINI_API_KEY` | Gemini AI parsing/chat (`gemini.service.js`) | [Google AI Studio](https://aistudio.google.com/) |
| `SPREADSHEET_ID` | Target Google Spreadsheet for the stakeholder mirror | The ID segment of the sheet's URL: `.../d/<SPREADSHEET_ID>/edit` |
| `SHEET_RECORDING` | Tab name for the Recording sheet (default `Recording`) | Match the tab name in your spreadsheet |
| `SHEET_KAMBING` | Tab name for the Goat sheet (default `Kambing`) | Match the tab name in your spreadsheet |
| `SHEET_PETERNAK` | Tab name for the Farmer sheet (default `Peternak`) | Match the tab name in your spreadsheet |
| `WA_ACCESS_TOKEN` | Sends/receives WhatsApp messages via Meta Cloud API | Meta Business Settings → System Users → generate a permanent token with `whatsapp_business_messaging` |
| `WA_PHONE_NUMBER_ID` | Identifies which WhatsApp number to send from | Meta Developer Console → WhatsApp → API Setup (Phone Number ID, **not** the WhatsApp Business Account ID) |
| `WA_VERIFY_TOKEN` | Shared secret for the webhook verification handshake (`GET /api/webhook`) | Any string you choose; must match what you enter in Meta's dashboard |
| `CLOUDINARY_CLOUD_NAME` | Photo storage | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Photo storage | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Photo storage | Cloudinary dashboard |
| `DATABASE_URL` | Prisma's pooled connection (used at runtime) | Supabase project settings → Database → Connection pooling string, add `?pgbouncer=true` |
| `DIRECT_URL` | Prisma's direct connection (used for migrations) | Supabase project settings → Database → Direct connection string |
| `DB_PASSWORD` | Referenced alongside `DATABASE_URL`/`DIRECT_URL` for local convenience | Your Supabase database password |
| `JWT_SECRET` | Signs/verifies dashboard auth tokens | Any long random string; falls back to an insecure development default if unset — **must** be set in production |
| `GOOGLE_CLIENT_ID` | Verifies Google Sign-In ID tokens (`auth.controller.js`) | Google Cloud Console → OAuth 2.0 Client IDs (Web application) |
| `GOOGLE_CREDENTIALS` | Google Sheets service-account credentials as a JSON string, used in production/Vercel where a credentials file can't be committed (`sheets.service.js`) | Paste the full contents of your downloaded service-account JSON key |

## Local vs. production credential loading for Sheets

`sheets.service.js#getAuthClient()` checks `process.env.GOOGLE_CREDENTIALS` first; if unset, it falls back to reading a `google-credentials.json` file from the project root (path from `config.sheets.credentialsPath`). Locally, keep a `google-credentials.json` file (gitignored) instead of setting `GOOGLE_CREDENTIALS`. On Vercel, set `GOOGLE_CREDENTIALS` since the file can't be deployed — see [`deployment.md`](deployment.md).

The service account's `client_email` (from the credentials JSON) must be shared as an **Editor** on the target Google Spreadsheet, or every Sheets write will fail with a permission error.

## Frontend

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the Axios client (`src/lib/axios.ts`) targets, e.g. `http://localhost:5000/api` locally or the deployed backend's `/api` in production |

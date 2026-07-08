# Installation

## Prerequisites

- Node.js (18+ recommended for native `fetch` support used in `whatsapp.service.js`)
- A PostgreSQL database (this project targets Supabase — pooled + direct connection strings)
- Accounts/credentials for: Google AI Studio (Gemini), Meta for Developers (WhatsApp Cloud API), Google Cloud (Sheets API service account), Cloudinary

## Clone and install

```bash
git clone <repo-url>
cd recording-ternak

cd backend
npm install    # runs `prisma generate` automatically via postinstall

cd ../frontend
npm install
```

## Backend first run

1. Copy `backend/.env.example` to `backend/.env` and fill in every variable — see [`environment.md`](environment.md) for what each one is and where to get it.
2. Push the Prisma schema to your database (see [`database/migration.md`](../database/migration.md) for `db:push` vs `db:migrate`):
   ```bash
   cd backend
   npm run db:push
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:5000`. Health check: `GET /health`.
4. Expose it publicly for WhatsApp webhook testing:
   ```bash
   npx ngrok http 5000
   ```
   Then configure the callback URL in Meta's dashboard as `https://<ngrok-domain>/api/webhook` — see [`external-api-integration`] portal steps or the project's original setup notes in the repository README.

## Frontend first run

1. Create `frontend/.env.local` with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```
2. Start the dev server:
   ```bash
   cd frontend
   npm run dev
   ```
   Runs on `http://localhost:3000`.
3. Log in with an admin account. There is no self-registration — the first `SUPERADMIN` account must be created directly in the database (e.g. via `npm run db:studio` in `backend/`, hashing the password with bcrypt) since `POST /api/admins` itself requires an existing `SUPERADMIN`.

## Verify the full loop

1. Send a WhatsApp message like `"kambing 12 kawin kemarin"` to your configured WhatsApp Business number.
2. Confirm you receive a summary reply and, after replying `ya`, a "saved" confirmation.
3. Check the record appears in the dashboard's Recording page and in the linked Google Spreadsheet.

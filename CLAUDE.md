# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Recording Ternak** is a livestock (goat) health record-keeping system for a KKN (community service internship) project. Farmers send free-form WhatsApp messages in casual Indonesian, and Gemini AI parses the text into structured data stored in PostgreSQL and synced to Google Sheets in real-time.

## Repository Structure

```
recording-ternak/
├── backend/       # Node.js + Express serverless API
├── frontend/      # Next.js 16 + shadcn/ui dashboard
└── node_modules/  # Root-level shared deps
```

## Commands

### Backend (`cd backend`)

```bash
npm run dev          # Start Express server on port 5000
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Run migrations (creates new migration)
npm run db:push      # Push schema to DB without migration (dev only)
npm run db:studio    # Open Prisma Studio GUI

```

### Frontend (`cd frontend`)

```bash
npm run dev    # Start Next.js dev server on port 3000
npm run build  # Production build
npm run lint   # Run ESLint
```

### Local WhatsApp Webhook Testing

```bash
npx ngrok http 5000  # Expose backend to Meta webhook verification
```

## Architecture

### Backend Data Flow

WhatsApp webhook → `controllers/` → `services/` → `repositories/` (Prisma/PostgreSQL) + `sheets.service.js` (Google Sheets sync) → WhatsApp reply

**Key services:**

- `gemini.service.js` — Calls Gemini AI to parse casual Indonesian text into structured JSON. Uses `gemini-2.5-flash` for parsing, `gemini-2.0-flash-lite` for lightweight chat.
- `recording.service.js` — Orchestrates the full recording workflow.
- `sheets.service.js` / `sync.service.js` — Syncs Prisma data to Google Sheets for stakeholder viewing.
- `whatsapp.service.js` — Sends messages back to farmers via Meta Cloud API.

**Configuration hub:** `backend/src/config/index.js` defines data schema fields, sheet column mappings, and model names. Extend here when adding new record types.

### Database Schema (Prisma)

- `Peternak` (Farmer) → has many `Kambing` (Goats)
- `Kambing` (Goat) → has many `Recording` (Health Records)
- `Admin` — user auth (Google OAuth + email/password)
- Cascade deletes are enabled.

### Frontend

Next.js App Router with shadcn/ui components. Authentication scaffolding exists in `src/lib/auth` and `src/services/auth.service`. API calls go through Axios client in `src/lib/`.

## Environment Variables

Backend requires a `.env` file — see `backend/.env.example`. Key vars:

- `DATABASE_URL` — PostgreSQL connection string
- `GEMINI_API_KEY` — Google Generative AI key
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VERIFY_TOKEN` — Meta Cloud API
- `GOOGLE_CREDENTIALS` — Service account JSON (as a string) for Sheets access
- `SPREADSHEET_ID` — Target Google Sheets ID

## Deployment

Both backend and frontend deploy to Vercel. Backend uses `backend/vercel.json` for serverless function config. Environment variables must be set in the Vercel dashboard (not `.env` files).

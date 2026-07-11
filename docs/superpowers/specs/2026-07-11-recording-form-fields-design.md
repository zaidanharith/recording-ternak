# Recording Form: Date Pickers, Kondisi, Terjual Radio, Recording Date — Design

Date: 2026-07-11

## Context

The dashboard's recording form (`recording-form-dialog.tsx`) currently treats every field as free text, mirroring how the WhatsApp bot originally captured everything as loosely-typed strings (`matingDate`/`birthDate` as `String @default("-")`, `sold` as free text). This spec tightens four things:

1. `matingDate`/`birthDate` become real date inputs (`<input type="date">`) instead of plain text.
2. A new **Kondisi** field (Sehat / Sakit) is added.
3. **Status Terjual** becomes a Ya/Tidak radio instead of free text.
4. A new **Tanggal Recording** field is added, with a "Hari ini" checkbox that locks it to today.

Because the admin form's date picker needs real ISO dates to work, and the WhatsApp bot is the only other writer of these fields, this also means updating the Gemini parsing prompt so bot-originated recordings produce proper dates and constrained enum values — not just the dashboard form.

Only 5 `Recording` rows currently exist, all with clean `DD/MM/YYYY` or `"-"` values for dates and `"-"` for `sold` — the migration path is low-risk.

## 1. Schema changes (`backend/prisma/schema.prisma`, `Recording` model)

```prisma
enum SoldStatus {
  YA
  TIDAK

  @@map("sold_status")
}

enum GoatCondition {
  SEHAT
  SAKIT

  @@map("goat_condition")
}

model Recording {
  ...
  matingDate     DateTime?       @map("mating_date") @db.Date
  birthDate      DateTime?       @map("birth_date") @db.Date
  recordingDate  DateTime        @map("recording_date") @db.Date
  condition      GoatCondition?  @map("condition")
  sold           SoldStatus?
  ...
}
```

- `matingDate`/`birthDate`: nullable, no default. `"-"` (unknown) now means `null` instead of the string `"-"`.
- `sold`: nullable `SoldStatus`, no default. `"-"` also becomes `null`.
- `condition`: new nullable `GoatCondition` — unset until the bot or an admin reports it.
- `recordingDate`: new **non-null** `Date` — the date the observation happened (distinct from `createdAt`, which is when the DB row was written). Always populated by the writer (bot defaults to today; dashboard form defaults to today with an explicit override).

**Migration** (hand-written, applied via `prisma migrate deploy` — `prisma migrate dev`'s shadow DB is out of sync with the one committed migration, same constraint hit during the `earTagNumber` change):

```sql
CREATE TYPE "sold_status" AS ENUM ('YA', 'TIDAK');
CREATE TYPE "goat_condition" AS ENUM ('SEHAT', 'SAKIT');

ALTER TABLE "recording" ADD COLUMN "recording_date" DATE;
UPDATE "recording" SET "recording_date" = "created_at"::date;
ALTER TABLE "recording" ALTER COLUMN "recording_date" SET NOT NULL;

ALTER TABLE "recording"
  ALTER COLUMN "mating_date" DROP DEFAULT,
  ALTER COLUMN "mating_date" TYPE DATE USING (
    CASE WHEN "mating_date" = '-' THEN NULL ELSE to_date("mating_date", 'DD/MM/YYYY') END
  );

ALTER TABLE "recording"
  ALTER COLUMN "birth_date" DROP DEFAULT,
  ALTER COLUMN "birth_date" TYPE DATE USING (
    CASE WHEN "birth_date" = '-' THEN NULL ELSE to_date("birth_date", 'DD/MM/YYYY') END
  );

ALTER TABLE "recording"
  ALTER COLUMN "sold" DROP DEFAULT,
  ALTER COLUMN "sold" TYPE "sold_status" USING (
    CASE
      WHEN "sold" ILIKE 'ya' THEN 'YA'::"sold_status"
      WHEN "sold" ILIKE 'tidak' OR "sold" ILIKE 'belum' THEN 'TIDAK'::"sold_status"
      ELSE NULL
    END
  );

ALTER TABLE "recording" ADD COLUMN "condition" "goat_condition";
```

Before applying: re-check current row values for `mating_date`/`birth_date`/`sold` the same way the earTagNumber migration did (read-only query), to confirm no row has drifted from the clean `DD/MM/YYYY`/`"-"` shape seen during design.

## 2. Gemini prompt / WhatsApp bot (`backend/src/config/index.js`, `backend/src/services/gemini.service.js`, `backend/src/services/recording.service.js`)

- `config.dataSchema.aiParseFields`:
  - `tanggal_kawin`/`tanggal_beranak`: description changed to instruct ISO `YYYY-MM-DD` output (dropping "pertahankan format asli", which contradicted the prompt's existing normalization rule).
  - `terjual`: description tightened to only `"Ya"`, `"Tidak"`, or `"-"` — a partial-sale nuance ("2 ekor terjual") is no longer captured here; the model is instructed to fold that detail into `catatan` instead.
  - New `kondisi` field: `"Kondisi kesehatan kambing saat ini: 'Sehat' atau 'Sakit'. Isi '-' jika tidak disebutkan."`
- `gemini.service.js` `parseMessage`/`classifyMessageInConfirmation` prompt rule 5 (dates): normalize to **ISO `YYYY-MM-DD`** instead of `DD/MM/YYYY`.
- `recording.repository.js`: add two small conversion helpers used by both `createRecording` (WA path) and `createManualRecording` (dashboard path):
  - `parseRecordingDate(value)`: `"-"`/empty/undefined → `null`; a `YYYY-MM-DD` string → `Date`; otherwise throws (`400` at the controller boundary for the manual path).
  - `parseSoldStatus(value)` / `parseGoatCondition(value)`: `"-"`/empty → `null`; `"Ya"`/`"Sehat"` etc. (case-insensitive) → the matching enum value; otherwise throws.
  - Both creators also set `recordingDate: new Date()` unless an explicit value is supplied (dashboard form always supplies one; WA path never does, so it always defaults to today).
- `buildKonfirmasiMessage`/`buildSuksesMessage` (`recording.service.js`): add a "🏥 Kondisi" line. Add a tiny `formatDateForMessage(iso)` helper (ISO → `DD/MM/YYYY`) used only for these chat-facing strings — storage stays ISO.
- `sheets.service.js`: `recordingFieldMap` and the full-sync row builder currently read `r.matingDate`/`r.birthDate`/`r.sold` as plain strings for the sheet cell value. These now need to format `Date` → `id-ID` locale date string (`'-'` when `null`) and enum → `"Ya"/"Tidak"`/`"Sehat"/"Sakit"` (`'-'` when `null`). Add a `kondisi` column to `config.dataSchema.recording` and map it the same way as the other fields.

## 3. Backend controller (`backend/src/controllers/recording.controller.js`)

- Create/update: accept `matingDate`, `birthDate`, `recordingDate` as `YYYY-MM-DD` strings, `sold` as `"YA"`/`"TIDAK"`, `condition` as `"SEHAT"`/`"SAKIT"`. Run them through the new repository parse helpers; catch the parse error and respond `400` with the message, mirroring the `parseEarTagNumber` pattern from the ear-tag-number change.

## 4. Frontend

**`types/recording.ts`:**
- `matingDate`, `birthDate`: `string | null` (ISO `YYYY-MM-DD` over the wire).
- `recordingDate`: `string` (always present).
- `sold`: `"YA" | "TIDAK" | null`.
- `condition`: `"SEHAT" | "SAKIT" | null`.

**`recording-form-dialog.tsx`:**
- `matingDate`/`birthDate`: `<Input type="date">`, zod `z.string().optional()` (native date inputs already emit `YYYY-MM-DD` or `""`).
- New **Kondisi** field: `<Select>` (Sehat/Sakit), same pattern as the existing Status `<Select>`.
- **Status Terjual**: replace the free-text `<Input>` with a `RadioGroup` (Ya/Tidak). shadcn's `radio-group` primitive isn't in `components/ui` yet — add it via the shadcn CLI, matching the project's existing base-ui-flavored primitives.
- New **Tanggal Recording** field: `<Input type="date">` + a "Hari ini" checkbox (reusing the `Checkbox` component already used for the ear-tag auto-number toggle in `goat-form-dialog.tsx`). Checking it sets the field to today's date and disables the input; at submit time, if checked, the submitted value is always `new Date()` (recomputed then, not just whatever the disabled input displays) — covers the form-left-open-past-midnight edge case. Unchecking re-enables manual picking. Defaults to checked (today) for new recordings.

**`recording/page.tsx` (table):**
- Add **Kondisi** and **Terjual** columns rendered as small `Badge`s (matching the existing Status badge treatment), so the new fields are visible in the list, not just in the edit dialog.

## Testing

- Backend: unit tests for the new repository parse helpers (valid/invalid/empty inputs for date, sold, condition), and controller tests for the new `400` paths — following the existing `goat.repository`/`goat.controller` test patterns.
- Update existing `recording.service.test.js` fixtures that currently use string dates/sold values in mocked session data, where they'd now break the (mocked) repository call shape.
- Frontend: manual verification via the `run` skill (start the dev server, open the recording form, exercise date pickers / Kondisi select / Terjual radio / "Hari ini" checkbox, submit, confirm the table shows the new columns).

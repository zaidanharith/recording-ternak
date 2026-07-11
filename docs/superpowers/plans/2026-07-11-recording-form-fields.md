# Recording Form Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `matingDate`/`birthDate` into real dates, add a Kondisi (Sehat/Sakit) field, turn Terjual into a Ya/Tidak enum + radio, and add a non-null `recordingDate` field with a "Hari ini" checkbox — across the Prisma schema, the WhatsApp bot's Gemini parsing, Sheets sync, and the dashboard recording form.

**Architecture:** Prisma schema gains two new enums (`SoldStatus`, `GoatCondition`) and three date/enum field changes on `Recording`, applied via a hand-written migration (the project's shadow DB is out of sync with `prisma migrate dev`, so migrations are applied with `prisma migrate deploy`). Parsing/validation of the new field shapes lives in `recording.repository.js` as small pure helpers, reused by both the WhatsApp save path and the dashboard create/update controller path — mirroring the `parseEarTagNumber` pattern already used in `goat.repository.js`. The Gemini prompt is updated to emit ISO dates and the new `kondisi` field. The frontend form switches free-text inputs to `<input type="date">`, a `Select`, and a new `RadioGroup` UI primitive (hand-written from the already-vendored `@base-ui/react/radio` + `radio-group` packages, no network install needed).

**Tech Stack:** Prisma + PostgreSQL (Supabase), Express, Google Generative AI (Gemini), Next.js + React Hook Form + Zod + shadcn/ui (base-ui flavor).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-11-recording-form-fields-design.md`
- `prisma migrate dev` cannot be used (shadow DB out of sync) — write migration SQL by hand and apply with `prisma migrate deploy`, per the design doc and the precedent set by the `earTagNumber` Int migration.
- No comments in generated code (project-wide convention).
- Backend: CommonJS (`require`/`module.exports`), Indonesian user-facing strings, existing `success`/`message`/`data` JSON envelope.
- Frontend: TypeScript strict, named exports, `react-icons` only, Tailwind utilities, existing `Form`/`FormField` (RHF + Zod) pattern.
- Only 5 `Recording` rows exist today, all clean (`DD/MM/YYYY` or `"-"` for dates, `"-"` for `sold`) — re-verify this immediately before applying the migration since state may have changed.

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_recording_condition_and_dates/migration.sql`

**Interfaces:**
- Produces: Prisma enums `SoldStatus { YA, TIDAK }`, `GoatCondition { SEHAT, SAKIT }`; `Recording.matingDate`/`birthDate` become `DateTime? @db.Date`; `Recording.recordingDate` (new, `DateTime @db.Date`, non-null); `Recording.sold` becomes `SoldStatus?`; `Recording.condition` (new, `GoatCondition?`).

- [ ] **Step 1: Re-verify current data is still clean**

Run:
```bash
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const recs = await prisma.recording.findMany({ select: { matingDate: true, birthDate: true, sold: true } });
  const bad = recs.filter(r => (r.matingDate !== '-' && !/^\d{2}\/\d{2}\/\d{4}$/.test(r.matingDate)) || (r.birthDate !== '-' && !/^\d{2}\/\d{2}\/\d{4}$/.test(r.birthDate)) || (r.sold !== '-' && !['Ya','Tidak'].includes(r.sold)));
  console.log('rows not matching clean pattern:', bad.length, JSON.stringify(bad));
  await prisma.\$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
"
```
Expected: `rows not matching clean pattern: 0 []`. If it's not 0, stop and adjust the migration's `USING` clauses to handle the extra shapes before continuing.

- [ ] **Step 2: Edit `backend/prisma/schema.prisma`**

Add these two enums directly after the existing `RecordingSource` enum:

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
```

Replace the `Recording` model's `matingDate`, `birthDate`, `sold` lines and add `recordingDate`/`condition`, so the full model reads:

```prisma
model Recording {
  id             String          @id @default(uuid())
  goatId         String          @map("goat_id")
  goat           Goat            @relation(fields: [goatId], references: [id], onDelete: Cascade)
  senderName     String          @map("sender_name")
  matingDate     DateTime?       @map("mating_date") @db.Date
  birthDate      DateTime?       @map("birth_date") @db.Date
  recordingDate  DateTime        @map("recording_date") @db.Date
  maleKidCount   String          @default("-") @map("male_kid_count")
  femaleKidCount String          @default("-") @map("female_kid_count")
  matingNumber   String          @default("-") @map("mating_number")
  saleTarget     String          @default("-") @map("sale_target")
  sold           SoldStatus?
  condition      GoatCondition?
  notes          String          @default("-")
  status         RecordingStatus @default(PERLU_REVIEW)
  source         RecordingSource @default(WA)
  photoUrl       String?         @map("photo_url")
  photoPublicId  String?         @map("photo_public_id")
  createdAt      DateTime        @default(now())

  @@map("recording")
}
```

- [ ] **Step 3: Create the migration directory**

Run:
```bash
cd backend/prisma/migrations && node -e "console.log(new Date().toISOString().replace(/[-:]/g,'').replace('T','').split('.')[0])"
```
Take the printed timestamp (e.g. `20260711160000`) and run:
```bash
mkdir -p "20260711160000_add_recording_condition_and_dates"
```
(substitute the actual printed timestamp for the directory name in this and the next step)

- [ ] **Step 4: Write `backend/prisma/migrations/<timestamp>_add_recording_condition_and_dates/migration.sql`**

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

- [ ] **Step 5: Apply the migration and regenerate the client**

Run:
```bash
cd backend && npx prisma migrate deploy
```
Expected: `All migrations have been successfully applied.`

Run:
```bash
cd backend && npx prisma generate
```
Expected: `Generated Prisma Client`.

- [ ] **Step 6: Verify the data landed correctly**

Run:
```bash
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const recs = await prisma.recording.findMany({ select: { matingDate: true, birthDate: true, recordingDate: true, sold: true, condition: true } });
  console.log(JSON.stringify(recs, null, 2));
  await prisma.\$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
"
```
Expected: `matingDate`/`birthDate` are `null` or ISO datetime strings (matching the original `DD/MM/YYYY` values converted to dates), `recordingDate` is a non-null ISO datetime string for every row, `sold` is `null` (all 5 original rows were `"-"`), `condition` is `null`.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(backend): add recording condition, sold enum, and recording date"
```

---

### Task 2: Repository parse helpers + create functions

**Files:**
- Modify: `backend/src/repositories/recording.repository.js`
- Modify: `backend/src/repositories/__tests__/recording.repository.test.js`

**Interfaces:**
- Consumes: nothing new (pure functions + existing `prisma.recording.create`/`update`).
- Produces: exported `parseRecordingDate(value)`, `parseSoldStatus(value)`, `parseGoatCondition(value)` — each returns `null` for empty/`"-"`/`undefined`/`null`, the parsed value on success, and **throws** `new Error(message)` on an unparseable value, where `message` is one of the exported constants `ERR_INVALID_DATE`, `ERR_INVALID_SOLD`, `ERR_INVALID_CONDITION`. Used by Task 3 (controller) to detect validation failures by message.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/repositories/__tests__/recording.repository.test.js` (append at the end of the file, after the existing `describe('createRecording', ...)` block):

```javascript
describe('parseRecordingDate', () => {
  const { parseRecordingDate } = require('../recording.repository');

  it('returns null for "-", empty string, and undefined', () => {
    expect(parseRecordingDate('-')).toBeNull();
    expect(parseRecordingDate('')).toBeNull();
    expect(parseRecordingDate(undefined)).toBeNull();
  });

  it('parses a valid ISO date string into a Date', () => {
    const result = parseRecordingDate('2026-07-11');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString().slice(0, 10)).toBe('2026-07-11');
  });

  it('throws on an unparseable date string', () => {
    expect(() => parseRecordingDate('bukan tanggal')).toThrow('Tanggal tidak valid, gunakan format YYYY-MM-DD (contoh: 2026-07-11).');
  });
});

describe('parseSoldStatus', () => {
  const { parseSoldStatus } = require('../recording.repository');

  it('returns null for "-", empty string, and undefined', () => {
    expect(parseSoldStatus('-')).toBeNull();
    expect(parseSoldStatus('')).toBeNull();
    expect(parseSoldStatus(undefined)).toBeNull();
  });

  it('maps case-insensitive Ya/Tidak/Belum and the enum values themselves', () => {
    expect(parseSoldStatus('Ya')).toBe('YA');
    expect(parseSoldStatus('tidak')).toBe('TIDAK');
    expect(parseSoldStatus('Belum')).toBe('TIDAK');
    expect(parseSoldStatus('YA')).toBe('YA');
    expect(parseSoldStatus('TIDAK')).toBe('TIDAK');
  });

  it('throws on an unrecognized value', () => {
    expect(() => parseSoldStatus('2 ekor')).toThrow('Status terjual harus "Ya" atau "Tidak".');
  });
});

describe('parseGoatCondition', () => {
  const { parseGoatCondition } = require('../recording.repository');

  it('returns null for "-", empty string, and undefined', () => {
    expect(parseGoatCondition('-')).toBeNull();
    expect(parseGoatCondition('')).toBeNull();
    expect(parseGoatCondition(undefined)).toBeNull();
  });

  it('maps case-insensitive Sehat/Sakit and the enum values themselves', () => {
    expect(parseGoatCondition('Sehat')).toBe('SEHAT');
    expect(parseGoatCondition('sakit')).toBe('SAKIT');
    expect(parseGoatCondition('SEHAT')).toBe('SEHAT');
  });

  it('throws on an unrecognized value', () => {
    expect(() => parseGoatCondition('lumayan')).toThrow('Kondisi harus "Sehat" atau "Sakit".');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest recording.repository.test.js`
Expected: FAIL — `parseRecordingDate is not a function` (and similarly for the other two).

- [ ] **Step 3: Implement the helpers and wire them into `createRecording`/`createManualRecording`**

Read `backend/src/repositories/recording.repository.js` first (Read tool), then apply these edits:

Add near the top of the file, right after `const prisma = require('../lib/prisma');`:

```javascript
const ERR_INVALID_DATE = 'Tanggal tidak valid, gunakan format YYYY-MM-DD (contoh: 2026-07-11).';
const ERR_INVALID_SOLD = 'Status terjual harus "Ya" atau "Tidak".';
const ERR_INVALID_CONDITION = 'Kondisi harus "Sehat" atau "Sakit".';

const isEmpty = (value) => value === undefined || value === null || value === '' || value === '-';

const parseRecordingDate = (value) => {
  if (isEmpty(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(ERR_INVALID_DATE);
  }
  return date;
};

const SOLD_STATUS_MAP = { ya: 'YA', tidak: 'TIDAK', belum: 'TIDAK' };

const parseSoldStatus = (value) => {
  if (isEmpty(value)) return null;
  if (value === 'YA' || value === 'TIDAK') return value;
  const mapped = SOLD_STATUS_MAP[String(value).trim().toLowerCase()];
  if (!mapped) throw new Error(ERR_INVALID_SOLD);
  return mapped;
};

const CONDITION_MAP = { sehat: 'SEHAT', sakit: 'SAKIT' };

const parseGoatCondition = (value) => {
  if (isEmpty(value)) return null;
  if (value === 'SEHAT' || value === 'SAKIT') return value;
  const mapped = CONDITION_MAP[String(value).trim().toLowerCase()];
  if (!mapped) throw new Error(ERR_INVALID_CONDITION);
  return mapped;
};
```

Replace the `createRecording` function body with:

```javascript
const createRecording = async (recordingData) => {
  return await prisma.recording.create({
    data: {
      goatId: recordingData.kambingId,
      senderName: recordingData.pengirim,
      matingDate: parseRecordingDate(recordingData.tanggal_kawin),
      birthDate: parseRecordingDate(recordingData.tanggal_beranak),
      recordingDate: parseRecordingDate(recordingData.recordingDate) || new Date(),
      maleKidCount: String(recordingData.jumlah_anak_jantan || '-'),
      femaleKidCount: String(recordingData.jumlah_anak_betina || '-'),
      matingNumber: String(recordingData.perkawinan_ke || '-'),
      saleTarget: recordingData.target_penjualan || '-',
      sold: parseSoldStatus(recordingData.terjual),
      condition: parseGoatCondition(recordingData.kondisi),
      notes: recordingData.catatan || '-',
      photoUrl: recordingData.photoUrl || null,
      photoPublicId: recordingData.photoPublicId || null,
    }
  });
};
```

Replace the `createManualRecording` function with:

```javascript
const createManualRecording = async ({
  goatId, senderName, matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
  matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId,
}) => {
  return await prisma.recording.create({
    data: {
      goatId,
      senderName,
      matingDate: parseRecordingDate(matingDate),
      birthDate: parseRecordingDate(birthDate),
      recordingDate: parseRecordingDate(recordingDate) || new Date(),
      maleKidCount: maleKidCount !== undefined ? String(maleKidCount) : '-',
      femaleKidCount: femaleKidCount !== undefined ? String(femaleKidCount) : '-',
      matingNumber: matingNumber !== undefined ? String(matingNumber) : '-',
      saleTarget: saleTarget || '-',
      sold: parseSoldStatus(sold),
      condition: parseGoatCondition(condition),
      notes: notes || '-',
      photoUrl: photoUrl || null,
      photoPublicId: photoPublicId || null,
      status: 'FINAL',
      source: 'MANUAL',
    },
  });
};
```

Update the `module.exports` block at the bottom to add the three new exports:

```javascript
module.exports = {
  parseRecordingDate,
  parseSoldStatus,
  parseGoatCondition,
  createRecording,
  getRecordingsByGoatId,
  getFullDataByFarmerId,
  getAllDataForQuery,
  createManualRecording,
  listRecordings,
  findRecordingById,
  updateRecording,
  deleteRecording,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest recording.repository.test.js`
Expected: PASS, all tests including the pre-existing `createManualRecording`/`createRecording` photo tests (those use `expect.objectContaining`, so the new fields don't break them).

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/recording.repository.js backend/src/repositories/__tests__/recording.repository.test.js
git commit -m "feat(backend): add date/sold/condition parsing to recording repository"
```

---

### Task 3: Controller validation for create/update

**Files:**
- Modify: `backend/src/controllers/recording.controller.js`
- Modify: `backend/src/controllers/__tests__/recording.controller.test.js`

**Interfaces:**
- Consumes: `recordingRepository.parseRecordingDate`, `parseSoldStatus`, `parseGoatCondition` (Task 2), and their error message constants — import via `recordingRepository.ERR_INVALID_DATE` etc. (add these three to Task 2's `module.exports` too — see Step 3 note below).
- Produces: `POST /api/recordings` and `PATCH /api/recordings/:id` respond `400` with the specific message when `matingDate`/`birthDate`/`recordingDate`/`sold`/`condition` fail to parse.

- [ ] **Step 1: Add the three error constants to Task 2's exports**

Read `backend/src/repositories/recording.repository.js`, then update its `module.exports` (already edited in Task 2) to also include `ERR_INVALID_DATE, ERR_INVALID_SOLD, ERR_INVALID_CONDITION`:

```javascript
module.exports = {
  ERR_INVALID_DATE,
  ERR_INVALID_SOLD,
  ERR_INVALID_CONDITION,
  parseRecordingDate,
  parseSoldStatus,
  parseGoatCondition,
  createRecording,
  getRecordingsByGoatId,
  getFullDataByFarmerId,
  getAllDataForQuery,
  createManualRecording,
  listRecordings,
  findRecordingById,
  updateRecording,
  deleteRecording,
};
```

- [ ] **Step 2: Write the failing tests**

Add to `backend/src/controllers/__tests__/recording.controller.test.js`, inside the existing `describe('updateRecording', ...)` block (after the `'allows moving a recording from PERLU_REVIEW to FINAL'` test):

```javascript
  it('rejects an invalid sold value', async () => {
    recordingRepository.parseSoldStatus.mockImplementation(() => {
      throw new Error('Status terjual harus "Ya" atau "Tidak".');
    });
    const req = { params: { id: 'r1' }, body: { sold: 'entahlah' } };
    const res = buildRes();

    await updateRecording(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.updateRecording).not.toHaveBeenCalled();
  });
```

Also add a new top-level `describe` block at the end of the file (before the final closing, i.e. after the last existing `describe`):

```javascript
describe('createRecording validation', () => {
  it('returns 400 when the condition value is invalid', async () => {
    recordingRepository.createManualRecording.mockRejectedValue(
      new Error('Kondisi harus "Sehat" atau "Sakit".')
    );
    const req = { body: { goatId: 'g1', condition: 'lumayan' }, user: { name: 'Admin Satu' } };
    const res = buildRes();

    await createRecording(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

Since `recordingRepository` is auto-mocked (`jest.mock('../../repositories/recording.repository')`), its named exports (including `parseSoldStatus`, `ERR_INVALID_DATE`, etc.) become `jest.fn()`/`undefined` automatically — the test above overrides `parseSoldStatus`'s mock implementation directly.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && npx jest recording.controller.test.js`
Expected: FAIL — `updateRecording` currently writes `sold` straight through without calling `parseSoldStatus`, so `res.status` is called with `200`, not `400`.

- [ ] **Step 4: Implement validation in the controller**

Read `backend/src/controllers/recording.controller.js`, then replace `exports.createRecording` with:

```javascript
exports.createRecording = async (req, res) => {
  try {
    const {
      goatId, matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId,
    } = req.body;

    if (!goatId) {
      return res.status(400).json({ success: false, message: 'goatId wajib diisi.' });
    }

    const recording = await recordingRepository.createManualRecording({
      goatId,
      senderName: req.user.name,
      matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId,
    });

    return res.status(201).json({
      success: true,
      message: 'Recording berhasil ditambahkan.',
      data: { recording },
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    if (isRecordingValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Create Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan recording.',
      error: error.message,
    });
  }
};
```

Add this helper near the top of the file, right after `const RECORDING_STATUSES = [...]`:

```javascript
const isRecordingValidationError = (error) =>
  error.message === recordingRepository.ERR_INVALID_DATE ||
  error.message === recordingRepository.ERR_INVALID_SOLD ||
  error.message === recordingRepository.ERR_INVALID_CONDITION;
```

Replace `exports.updateRecording` with:

```javascript
exports.updateRecording = async (req, res) => {
  try {
    const {
      matingDate, birthDate, recordingDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, condition, notes, photoUrl, photoPublicId, status,
    } = req.body;

    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.`,
      });
    }

    const updateData = {};
    if (matingDate !== undefined) updateData.matingDate = recordingRepository.parseRecordingDate(matingDate);
    if (birthDate !== undefined) updateData.birthDate = recordingRepository.parseRecordingDate(birthDate);
    if (recordingDate !== undefined) updateData.recordingDate = recordingRepository.parseRecordingDate(recordingDate) || new Date();
    if (maleKidCount !== undefined) updateData.maleKidCount = maleKidCount;
    if (femaleKidCount !== undefined) updateData.femaleKidCount = femaleKidCount;
    if (matingNumber !== undefined) updateData.matingNumber = matingNumber;
    if (saleTarget !== undefined) updateData.saleTarget = saleTarget;
    if (sold !== undefined) updateData.sold = recordingRepository.parseSoldStatus(sold);
    if (condition !== undefined) updateData.condition = recordingRepository.parseGoatCondition(condition);
    if (notes !== undefined) updateData.notes = notes;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (photoPublicId !== undefined) updateData.photoPublicId = photoPublicId;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    let oldPhotoPublicId = null;
    if (photoUrl !== undefined) {
      const existing = await recordingRepository.findRecordingById(req.params.id);
      if (existing && existing.photoUrl !== photoUrl && existing.photoPublicId) {
        oldPhotoPublicId = existing.photoPublicId;
      }
    }

    const recording = await recordingRepository.updateRecording(req.params.id, updateData);

    if (oldPhotoPublicId) {
      cloudinaryService.deleteImage(oldPhotoPublicId);
    }

    return res.status(200).json({
      success: true,
      message: 'Recording berhasil diperbarui.',
      data: { recording },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    if (isRecordingValidationError(error)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Update Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui recording.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npx jest recording.controller.test.js`
Expected: PASS, all tests including the pre-existing photo-replacement and delete tests.

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/recording.controller.js backend/src/controllers/__tests__/recording.controller.test.js backend/src/repositories/recording.repository.js
git commit -m "feat(backend): validate recording date/sold/condition on create and update"
```

---

### Task 4: Gemini prompt + config dataSchema

**Files:**
- Modify: `backend/src/config/index.js`
- Modify: `backend/src/services/gemini.service.js`

**Interfaces:**
- Produces: `config.dataSchema.aiParseFields` gains a `kondisi` entry; `tanggal_kawin`/`tanggal_beranak`/`terjual` descriptions updated. `config.dataSchema.recording` (sheet columns) gains a `kondisi` column. Gemini prompts (`parseMessage`, `classifyMessageInConfirmation`) instruct ISO `YYYY-MM-DD` dates instead of `DD/MM/YYYY`.

- [ ] **Step 1: Edit `backend/src/config/index.js`**

Read the file, then in `dataSchema.recording`, replace:

```javascript
      { key: 'terjual',            label: 'Terjual'             },
      { key: 'catatan',            label: 'Catatan'             },
```

with:

```javascript
      { key: 'terjual',            label: 'Terjual'             },
      { key: 'kondisi',            label: 'Kondisi'             },
      { key: 'catatan',            label: 'Catatan'             },
```

In `dataSchema.aiParseFields`, replace:

```javascript
      { key: 'tanggal_kawin',      description: 'Tanggal perkawinan kambing. Pertahankan format asli peternak. Isi "-" jika tidak disebutkan.' },
      { key: 'tanggal_beranak',    description: 'Tanggal melahirkan/beranak. Pertahankan format asli peternak. Isi "-" jika tidak disebutkan.' },
```

with:

```javascript
      { key: 'tanggal_kawin',      description: 'Tanggal perkawinan kambing, format ISO YYYY-MM-DD. Isi "-" jika tidak disebutkan.' },
      { key: 'tanggal_beranak',    description: 'Tanggal melahirkan/beranak, format ISO YYYY-MM-DD. Isi "-" jika tidak disebutkan.' },
```

And replace:

```javascript
      { key: 'terjual',            description: 'Status terjual: "Ya", "Belum", atau keterangan lain. Isi "-" jika tidak disebutkan.' },
      { key: 'catatan',            description: 'Informasi tambahan. Isi "-" jika tidak ada.' },
```

with:

```javascript
      { key: 'terjual',            description: 'Status terjual: "Ya" jika sudah terjual, "Tidak" jika belum. Detail lain (misal jumlah yang terjual) masukkan ke catatan, bukan di sini. Isi "-" jika tidak disebutkan.' },
      { key: 'kondisi',            description: 'Kondisi kesehatan kambing saat ini: "Sehat" atau "Sakit". Isi "-" jika tidak disebutkan.' },
      { key: 'catatan',            description: 'Informasi tambahan. Isi "-" jika tidak ada.' },
```

- [ ] **Step 2: Edit `backend/src/services/gemini.service.js`**

Read the file, then in `parseMessage`'s prompt template, replace:

```
5. TANGGAL: Normalisasi SEMUA tanggal ke format DD/MM/YYYY. Gunakan konteks hari ini untuk menentukan tahun/bulan yang dimaksud (misal "kemarin", "12 februari", "minggu lalu"). Jika tahun tidak disebutkan, gunakan tahun saat ini. Jika tidak dapat ditentukan sama sekali, isi "-".`;
```

with:

```
5. TANGGAL: Normalisasi SEMUA tanggal ke format ISO YYYY-MM-DD. Gunakan konteks hari ini untuk menentukan tahun/bulan yang dimaksud (misal "kemarin", "12 februari", "minggu lalu"). Jika tahun tidak disebutkan, gunakan tahun saat ini. Jika tidak dapat ditentukan sama sekali, isi "-".`;
```

In `classifyMessageInConfirmation`'s prompt template, replace:

```
TANGGAL: Normalisasi ke format DD/MM/YYYY. Gunakan tahun saat ini jika tidak disebutkan.
```

with:

```
TANGGAL: Normalisasi ke format ISO YYYY-MM-DD. Gunakan tahun saat ini jika tidak disebutkan.
```

- [ ] **Step 3: Run the backend suite**

Run: `cd backend && npx jest`
Expected: all suites pass (no test asserts on prompt string content).

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/index.js backend/src/services/gemini.service.js
git commit -m "feat(backend): teach Gemini prompt ISO dates and a kondisi field"
```

---

### Task 5: `recording.service.js` — message building + saveReport wiring

**Files:**
- Modify: `backend/src/services/recording.service.js`

**Interfaces:**
- Consumes: `parsed.kondisi` (new field from Task 4's Gemini prompt), ISO date strings in `parsed.tanggal_kawin`/`parsed.tanggal_beranak`.
- Produces: `buildKonfirmasiMessage` shows a "🏥 Kondisi" line and displays dates as `DD/MM/YYYY` (chat-facing only; storage stays ISO via Task 2's `parseRecordingDate`). `saveReport` passes `kondisi` through to both `createRecording` (DB) and `appendRecording` (Sheets).

- [ ] **Step 1: Read the file**

Read `backend/src/services/recording.service.js` in full first (needed before editing).

- [ ] **Step 2: Add a date-formatting helper**

Add this function right above `const buildKonfirmasiMessage = ...`:

```javascript
const formatDateForMessage = (isoDate) => {
  if (!isoDate || isoDate === '-') return '-';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};
```

- [ ] **Step 3: Update `buildKonfirmasiMessage`**

Replace:

```javascript
const buildKonfirmasiMessage = (parsed, nomorTelinga, namaPeternak) => {
  const j = (val) => (val && val !== '-' ? val : '-');
  return [
    '📋 *Ringkasan laporan yang akan disimpan:*',
    '',
    `👤 Peternak: ${j(namaPeternak)}`,
    `🏷️ No. Telinga: ${j(nomorTelinga)}`,
    `💑 Tanggal Kawin: ${j(parsed.tanggal_kawin)}`,
    `🐣 Tanggal Beranak: ${j(parsed.tanggal_beranak)}`,
    `♂️ Anak Jantan: ${j(parsed.jumlah_anak_jantan)}  |  ♀️ Anak Betina: ${j(parsed.jumlah_anak_betina)}`,
    `🔢 Perkawinan Ke: ${j(parsed.perkawinan_ke)}`,
    `🎯 Target Jual: ${j(parsed.target_penjualan)}`,
    `💰 Terjual: ${j(parsed.terjual)}`,
    parsed.catatan && parsed.catatan !== '-' ? `📝 Catatan: ${parsed.catatan}` : null,
    '',
    'Apakah data di atas sudah benar?\nBalas *ya* untuk menyimpan, atau *tidak* untuk membatalkan.',
  ]
    .filter((l) => l !== null)
    .join('\n');
};
```

with:

```javascript
const buildKonfirmasiMessage = (parsed, nomorTelinga, namaPeternak) => {
  const j = (val) => (val && val !== '-' ? val : '-');
  return [
    '📋 *Ringkasan laporan yang akan disimpan:*',
    '',
    `👤 Peternak: ${j(namaPeternak)}`,
    `🏷️ No. Telinga: ${j(nomorTelinga)}`,
    `💑 Tanggal Kawin: ${formatDateForMessage(parsed.tanggal_kawin)}`,
    `🐣 Tanggal Beranak: ${formatDateForMessage(parsed.tanggal_beranak)}`,
    `♂️ Anak Jantan: ${j(parsed.jumlah_anak_jantan)}  |  ♀️ Anak Betina: ${j(parsed.jumlah_anak_betina)}`,
    `🔢 Perkawinan Ke: ${j(parsed.perkawinan_ke)}`,
    `🏥 Kondisi: ${j(parsed.kondisi)}`,
    `🎯 Target Jual: ${j(parsed.target_penjualan)}`,
    `💰 Terjual: ${j(parsed.terjual)}`,
    parsed.catatan && parsed.catatan !== '-' ? `📝 Catatan: ${parsed.catatan}` : null,
    '',
    'Apakah data di atas sudah benar?\nBalas *ya* untuk menyimpan, atau *tidak* untuk membatalkan.',
  ]
    .filter((l) => l !== null)
    .join('\n');
};
```

- [ ] **Step 4: Update `saveReport`**

In the `createRecording({...})` call inside `saveReport`, add `kondisi: parsed.kondisi,` right after `terjual: parsed.terjual,`:

```javascript
  const recording = await createRecording({
    kambingId: kambing.id,
    pengirim: peternak.name,
    tanggal_kawin: parsed.tanggal_kawin,
    tanggal_beranak: parsed.tanggal_beranak,
    jumlah_anak_jantan: parsed.jumlah_anak_jantan,
    jumlah_anak_betina: parsed.jumlah_anak_betina,
    perkawinan_ke: parsed.perkawinan_ke,
    target_penjualan: parsed.target_penjualan,
    terjual: parsed.terjual,
    kondisi: parsed.kondisi,
    catatan: parsed.catatan,
    photoUrl: photo?.url,
    photoPublicId: photo?.publicId,
  });
```

In the `appendRecording({...})` call a few lines below, add a `kondisi` field and format the two dates:

```javascript
    appendRecording({
      timestamp,
      nomor_telinga: nomorTelinga,
      nama_peternak: peternak.name,
      tanggal_kawin: formatDateForMessage(parsed.tanggal_kawin),
      tanggal_beranak: formatDateForMessage(parsed.tanggal_beranak),
      jumlah_anak_jantan: parsed.jumlah_anak_jantan,
      jumlah_anak_betina: parsed.jumlah_anak_betina,
      perkawinan_ke: parsed.perkawinan_ke,
      target_penjualan: parsed.target_penjualan,
      terjual: parsed.terjual,
      kondisi: parsed.kondisi,
      catatan: parsed.catatan,
    }),
```

- [ ] **Step 5: Run the backend suite**

Run: `cd backend && npx jest`
Expected: all suites pass (`recording.service.test.js` mocks `createRecording` and `appendRecording` entirely via `jest.mock('../../repositories/recording.repository')`/`jest.mock('../sheets.service')`, so these edits don't change any assertion).

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/recording.service.js
git commit -m "feat(backend): show kondisi and formatted dates in WhatsApp confirmation"
```

---

### Task 6: Sheets sync formatting

**Files:**
- Modify: `backend/src/services/sheets.service.js`

**Interfaces:**
- Produces: `syncAllFromDB`'s `recordingFieldMap` correctly stringifies the now-`Date`/enum-typed `matingDate`/`birthDate`/`sold`/`condition` fields for Google Sheets cells, and includes the new `kondisi` column.

- [ ] **Step 1: Read the file**

Read `backend/src/services/sheets.service.js` in full first.

- [ ] **Step 2: Edit `recordingFieldMap`**

Inside `syncAllFromDB`, replace:

```javascript
  const recordingFieldMap = {
    tanggal_kawin: (r) => r.matingDate,
    tanggal_beranak: (r) => r.birthDate,
    jumlah_anak_jantan: (r) => r.maleKidCount,
    jumlah_anak_betina: (r) => r.femaleKidCount,
    perkawinan_ke: (r) => r.matingNumber,
    target_penjualan: (r) => r.saleTarget,
    terjual: (r) => r.sold,
    catatan: (r) => r.notes,
  };
```

with:

```javascript
  const formatDateForSheet = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
  };

  const SOLD_LABELS = { YA: 'Ya', TIDAK: 'Tidak' };
  const CONDITION_LABELS = { SEHAT: 'Sehat', SAKIT: 'Sakit' };

  const recordingFieldMap = {
    tanggal_kawin: (r) => formatDateForSheet(r.matingDate),
    tanggal_beranak: (r) => formatDateForSheet(r.birthDate),
    jumlah_anak_jantan: (r) => r.maleKidCount,
    jumlah_anak_betina: (r) => r.femaleKidCount,
    perkawinan_ke: (r) => r.matingNumber,
    target_penjualan: (r) => r.saleTarget,
    terjual: (r) => SOLD_LABELS[r.sold] ?? '-',
    kondisi: (r) => CONDITION_LABELS[r.condition] ?? '-',
    catatan: (r) => r.notes,
  };
```

- [ ] **Step 3: Run the backend suite**

Run: `cd backend && npx jest`
Expected: all suites pass (no existing test file covers `sheets.service.js`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/sheets.service.js
git commit -m "feat(backend): format recording dates/enums for Sheets sync"
```

---

### Task 7: Fix `dashboard.service.js`'s sold check

**Files:**
- Modify: `backend/src/services/dashboard.service.js`
- Modify: `backend/src/services/__tests__/dashboard.service.test.js`

**Interfaces:**
- Produces: `getCharts()`'s `soldVsTarget.sold` count is computed from the exact enum value `'YA'` instead of a regex over free text.

- [ ] **Step 1: Update the test fixture (will still pass, but should reflect real data)**

Read `backend/src/services/__tests__/dashboard.service.test.js`, then in the `getCharts` test, replace:

```javascript
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '2', femaleKidCount: '1', sold: 'Ya', saleTarget: '-' },
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '-', femaleKidCount: '3', sold: 'Belum', saleTarget: '10 Juli' },
```

with:

```javascript
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '2', femaleKidCount: '1', sold: 'YA', saleTarget: '-' },
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '-', femaleKidCount: '3', sold: 'TIDAK', saleTarget: '10 Juli' },
```

- [ ] **Step 2: Run the test to confirm it currently still passes (regex happens to match)**

Run: `cd backend && npx jest dashboard.service.test.js`
Expected: PASS (the old `/ya/i.test('YA')` regex matches by coincidence).

- [ ] **Step 3: Replace the regex check with an exact enum comparison**

Read `backend/src/services/dashboard.service.js`, then replace:

```javascript
    const isSold = /ya/i.test(recording.sold || '');
```

with:

```javascript
    const isSold = recording.sold === 'YA';
```

- [ ] **Step 4: Run the test again to confirm it still passes**

Run: `cd backend && npx jest dashboard.service.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/dashboard.service.js backend/src/services/__tests__/dashboard.service.test.js
git commit -m "fix(backend): compare sold against the SoldStatus enum exactly"
```

---

### Task 8: Frontend types

**Files:**
- Modify: `frontend/src/types/recording.ts`

**Interfaces:**
- Produces: `SoldStatus`, `GoatCondition` exported types; `Recording.matingDate`/`birthDate` are `string | null` (full ISO datetime string from the API, e.g. `"2026-07-11T00:00:00.000Z"`); `Recording.recordingDate` is `string` (non-null); `Recording.sold`/`condition` are `SoldStatus | null` / `GoatCondition | null`.

- [ ] **Step 1: Rewrite the file**

Read `frontend/src/types/recording.ts`, then replace its full contents with:

```typescript
import type { Goat } from "@/types/goat";

export type RecordingStatus = "PERLU_REVIEW" | "FINAL";
export type RecordingSource = "WA" | "MANUAL";
export type SoldStatus = "YA" | "TIDAK";
export type GoatCondition = "SEHAT" | "SAKIT";

export interface Recording {
  id: string;
  goatId: string;
  goat?: Goat;
  senderName: string;
  matingDate: string | null;
  birthDate: string | null;
  recordingDate: string;
  maleKidCount: string;
  femaleKidCount: string;
  matingNumber: string;
  saleTarget: string;
  sold: SoldStatus | null;
  condition: GoatCondition | null;
  notes: string;
  status: RecordingStatus;
  source: RecordingSource;
  photoUrl: string | null;
  photoPublicId: string | null;
  createdAt: string;
}

export interface CreateRecordingInput {
  goatId: string;
  matingDate?: string;
  birthDate?: string;
  recordingDate?: string;
  maleKidCount?: string;
  femaleKidCount?: string;
  matingNumber?: string;
  saleTarget?: string;
  sold?: SoldStatus;
  condition?: GoatCondition;
  notes?: string;
  photoUrl?: string;
  photoPublicId?: string;
}

export interface UpdateRecordingInput {
  matingDate?: string;
  birthDate?: string;
  recordingDate?: string;
  maleKidCount?: string;
  femaleKidCount?: string;
  matingNumber?: string;
  saleTarget?: string;
  sold?: SoldStatus;
  condition?: GoatCondition;
  notes?: string;
  photoUrl?: string;
  photoPublicId?: string;
  status?: RecordingStatus;
}

export interface ListRecordingsQuery {
  page?: number;
  limit?: number;
  status?: RecordingStatus;
  goatId?: string;
  farmerId?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/recording.ts
git commit -m "feat(frontend): type recording date/sold/condition fields"
```

(Type-checking happens in Task 10 once the form and table are updated too — this task alone will show new TS errors in `recording-form-dialog.tsx`/`recording/page.tsx`, which is expected and resolved by Tasks 10–11.)

---

### Task 9: `RadioGroup` UI primitive

**Files:**
- Create: `frontend/src/components/ui/radio-group.tsx`

**Interfaces:**
- Produces: `RadioGroup` (root, `value`/`onValueChange`/`className` props) and `RadioGroupItem` (`value`/`className`/`disabled` props), following the same `@base-ui/react` + `cn()` pattern as `frontend/src/components/ui/checkbox.tsx`. Both packages (`@base-ui/react/radio`, `@base-ui/react/radio-group`) are already present in `node_modules` — no install needed.

- [ ] **Step 1: Write the file**

```typescript
"use client"

import { Radio } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: Radio.Root.Props) {
  return (
    <Radio.Root
      data-slot="radio-group-item"
      className={cn(
        "relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary dark:bg-input/30",
        className
      )}
      {...props}
    >
      <Radio.Indicator
        data-slot="radio-group-item-indicator"
        className="flex items-center justify-center after:block after:size-1.5 after:rounded-full after:bg-primary"
      />
    </Radio.Root>
  )
}

export { RadioGroup, RadioGroupItem }
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no new errors originating from `radio-group.tsx` (errors from `recording-form-dialog.tsx`/`recording/page.tsx` due to Task 8's type changes are expected at this point and resolved in Tasks 10–11).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/radio-group.tsx
git commit -m "feat(frontend): add RadioGroup UI primitive"
```

---

### Task 10: Recording form — date pickers, Kondisi, Terjual radio, Tanggal Recording

**Files:**
- Modify: `frontend/src/features/recordings/components/recording-form-dialog.tsx`

**Interfaces:**
- Consumes: `RadioGroup`/`RadioGroupItem` (Task 9), `SoldStatus`/`GoatCondition` types (Task 8), existing `Checkbox`/`Label`/`Select` primitives.
- Produces: form now submits `matingDate`/`birthDate`/`recordingDate` as `YYYY-MM-DD` strings, `sold` as `"YA"|"TIDAK"|undefined`, `condition` as `"SEHAT"|"SAKIT"|undefined`.

- [ ] **Step 1: Read the current file**

Read `frontend/src/features/recordings/components/recording-form-dialog.tsx` in full — needed before editing.

- [ ] **Step 2: Update imports**

Replace the import block (lines 1–40) with:

```typescript
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiPlus } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoatSelect } from "@/features/recordings/components/goat-select";
import { PhotoUploadField } from "@/features/recordings/components/photo-upload-field";
import { createRecording, updateRecording } from "@/services/recording.service";
import type {
  GoatCondition,
  Recording,
  RecordingStatus,
  SoldStatus,
} from "@/types/recording";

const todayIso = () => new Date().toISOString().slice(0, 10);

const recordingSchema = z.object({
  goatId: z.string().min(1, "Kambing wajib dipilih"),
  matingDate: z.string().optional(),
  birthDate: z.string().optional(),
  recordingDate: z.string().min(1, "Tanggal recording wajib diisi"),
  maleKidCount: z.string().optional(),
  femaleKidCount: z.string().optional(),
  matingNumber: z.string().optional(),
  saleTarget: z.string().optional(),
  sold: z.enum(["YA", "TIDAK"]).optional(),
  condition: z.enum(["SEHAT", "SAKIT"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["PERLU_REVIEW", "FINAL"]).optional(),
});

type RecordingValues = z.infer<typeof recordingSchema>;
```

- [ ] **Step 3: Update component state and defaultValues**

Replace:

```typescript
export function RecordingFormDialog({
  recording,
  defaultGoatId,
  onSaved,
  trigger,
}: RecordingFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(recording?.photoUrl ?? "");
  const [photoPublicId, setPhotoPublicId] = useState(
    recording?.photoPublicId ?? "",
  );
  const isEdit = !!recording;

  const form = useForm<RecordingValues>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      goatId: recording?.goatId ?? defaultGoatId ?? "",
      matingDate: recording?.matingDate ?? "",
      birthDate: recording?.birthDate ?? "",
      maleKidCount: recording?.maleKidCount ?? "",
      femaleKidCount: recording?.femaleKidCount ?? "",
      matingNumber: recording?.matingNumber ?? "",
      saleTarget: recording?.saleTarget ?? "",
      sold: recording?.sold ?? "",
      notes: recording?.notes ?? "",
      status: recording?.status,
    },
  });
```

with:

```typescript
export function RecordingFormDialog({
  recording,
  defaultGoatId,
  onSaved,
  trigger,
}: RecordingFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(recording?.photoUrl ?? "");
  const [photoPublicId, setPhotoPublicId] = useState(
    recording?.photoPublicId ?? "",
  );
  const [useToday, setUseToday] = useState(
    !recording || recording.recordingDate.slice(0, 10) === todayIso(),
  );
  const isEdit = !!recording;

  const form = useForm<RecordingValues>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      goatId: recording?.goatId ?? defaultGoatId ?? "",
      matingDate: recording?.matingDate?.slice(0, 10) ?? "",
      birthDate: recording?.birthDate?.slice(0, 10) ?? "",
      recordingDate: recording?.recordingDate?.slice(0, 10) ?? todayIso(),
      maleKidCount: recording?.maleKidCount ?? "",
      femaleKidCount: recording?.femaleKidCount ?? "",
      matingNumber: recording?.matingNumber ?? "",
      saleTarget: recording?.saleTarget ?? "",
      sold: recording?.sold ?? undefined,
      condition: recording?.condition ?? undefined,
      notes: recording?.notes ?? "",
      status: recording?.status,
    },
  });

  const handleTodayToggle = (checked: boolean) => {
    setUseToday(checked);
    if (checked) {
      form.setValue("recordingDate", todayIso(), { shouldValidate: true });
    }
  };
```

- [ ] **Step 4: Update `onSubmit` and the reset-after-save block**

Replace:

```typescript
  const onSubmit = async (values: RecordingValues) => {
    try {
      const payload = {
        ...values,
        photoUrl: photoUrl || undefined,
        photoPublicId: photoPublicId || undefined,
      };

      const saved = isEdit
        ? await updateRecording(recording.id, payload)
        : await createRecording(payload);

      toast.success(
        isEdit
          ? "Recording berhasil diperbarui."
          : "Recording berhasil ditambahkan.",
      );
      onSaved(saved);
      setOpen(false);
      form.reset();
    } catch (error) {
```

with:

```typescript
  const onSubmit = async (values: RecordingValues) => {
    try {
      const payload = {
        ...values,
        recordingDate: useToday ? todayIso() : values.recordingDate,
        photoUrl: photoUrl || undefined,
        photoPublicId: photoPublicId || undefined,
      };

      const saved = isEdit
        ? await updateRecording(recording.id, payload)
        : await createRecording(payload);

      toast.success(
        isEdit
          ? "Recording berhasil diperbarui."
          : "Recording berhasil ditambahkan.",
      );
      onSaved(saved);
      setOpen(false);
      form.reset();
      setUseToday(!recording);
    } catch (error) {
```

- [ ] **Step 5: Add the Tanggal Recording field + "Hari ini" checkbox**

Right after the closing `/>` of the `goatId` `FormField` (before the `<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">` that holds `matingDate`/`birthDate`/etc.), insert:

```typescript
            <FormField
              control={form.control}
              name="recordingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Recording</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={useToday} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-today"
                checked={useToday}
                onCheckedChange={(checked) => handleTodayToggle(checked === true)}
              />
              <Label htmlFor="use-today" className="text-xs font-normal text-muted-foreground">
                Hari ini
              </Label>
            </div>

```

- [ ] **Step 6: Switch `matingDate`/`birthDate` to date inputs**

Replace:

```typescript
              <FormField
                control={form.control}
                name="matingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Kawin</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

with:

```typescript
              <FormField
                control={form.control}
                name="matingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Kawin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

- [ ] **Step 7: Replace the free-text `sold` field with the Ya/Tidak radio, and add Kondisi**

Replace:

```typescript
              <FormField
                control={form.control}
                name="sold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Terjual</FormLabel>
                    <FormControl>
                      <Input placeholder="Ya / Belum" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
```

with:

```typescript
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kondisi</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as GoatCondition)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kondisi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEHAT">Sehat</SelectItem>
                          <SelectItem value="SAKIT">Sakit</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Terjual</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as SoldStatus)
                        }
                        className="flex flex-row gap-4 pt-1"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="YA" />
                          Ya
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="TIDAK" />
                          Tidak
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
```

- [ ] **Step 8: Type-check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `recording-form-dialog.tsx` (errors from `recording/page.tsx` are expected until Task 11).

- [ ] **Step 9: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors (the pre-existing `profile-form.tsx` warning is unrelated and expected).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/recordings/components/recording-form-dialog.tsx
git commit -m "feat(frontend): date pickers, Kondisi select, Terjual radio, recording date"
```

---

### Task 11: Recording table — show Kondisi and Terjual, format dates

**Files:**
- Modify: `frontend/src/features/recordings/components/recording-badges.tsx`
- Modify: `frontend/src/app/(dashboard)/recording/page.tsx`
- Create: `frontend/src/lib/format-date.ts`

**Interfaces:**
- Consumes: `GoatCondition`/`SoldStatus` types (Task 8).
- Produces: `formatDateId(value: string | null | undefined): string` (shared date formatter); `RecordingConditionBadge`, `RecordingSoldBadge` components; the recording table shows Kondisi and Terjual columns and displays `birthDate` formatted instead of the raw ISO string.

- [ ] **Step 1: Create the date formatter**

```typescript
export function formatDateId(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}
```

Write this to `frontend/src/lib/format-date.ts`.

- [ ] **Step 2: Add the two new badges**

Read `frontend/src/features/recordings/components/recording-badges.tsx`, then replace its full contents with:

```typescript
import { Badge } from "@/components/ui/badge";
import type {
  GoatCondition,
  RecordingSource,
  RecordingStatus,
  SoldStatus,
} from "@/types/recording";

export function RecordingStatusBadge({ status }: { status: RecordingStatus }) {
  return (
    <Badge variant={status === "PERLU_REVIEW" ? "destructive" : "secondary"}>
      {status === "PERLU_REVIEW" ? "Perlu Review" : "Final"}
    </Badge>
  );
}

export function RecordingSourceBadge({ source }: { source: RecordingSource }) {
  return (
    <Badge variant="outline">{source === "WA" ? "WhatsApp" : "Manual"}</Badge>
  );
}

export function RecordingConditionBadge({
  condition,
}: {
  condition: GoatCondition | null;
}) {
  if (!condition) return <span className="text-muted-foreground">-</span>;
  return (
    <Badge variant={condition === "SAKIT" ? "destructive" : "secondary"}>
      {condition === "SAKIT" ? "Sakit" : "Sehat"}
    </Badge>
  );
}

export function RecordingSoldBadge({ sold }: { sold: SoldStatus | null }) {
  if (!sold) return <span className="text-muted-foreground">-</span>;
  return (
    <Badge variant={sold === "YA" ? "secondary" : "outline"}>
      {sold === "YA" ? "Ya" : "Tidak"}
    </Badge>
  );
}
```

- [ ] **Step 3: Wire the badges + date formatting into the table**

Read `frontend/src/app/(dashboard)/recording/page.tsx`, then:

Add the import (alongside the existing `RecordingSourceBadge`/`RecordingStatusBadge` import):

```typescript
import {
  RecordingConditionBadge,
  RecordingSoldBadge,
  RecordingSourceBadge,
  RecordingStatusBadge,
} from "@/features/recordings/components/recording-badges";
```

Add the `formatDateId` import:

```typescript
import { formatDateId } from "@/lib/format-date";
```

In the `<TableHeader><TableRow>`, replace:

```typescript
                <SortableTableHead
                  sortKey="birthDate"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Tanggal Lahir
                </SortableTableHead>
                <TableHead>Anak (J/B)</TableHead>
```

with:

```typescript
                <SortableTableHead
                  sortKey="birthDate"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Tanggal Lahir
                </SortableTableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Anak (J/B)</TableHead>
                <TableHead>Terjual</TableHead>
```

In the row rendering (`<TableBody>`), replace:

```typescript
                  <TableCell>{recording.birthDate}</TableCell>
                  <TableCell>
                    {recording.maleKidCount} / {recording.femaleKidCount}
                  </TableCell>
                  <TableCell>
                    <RecordingSourceBadge source={recording.source} />
                  </TableCell>
```

with:

```typescript
                  <TableCell>{formatDateId(recording.birthDate)}</TableCell>
                  <TableCell>
                    <RecordingConditionBadge condition={recording.condition} />
                  </TableCell>
                  <TableCell>
                    {recording.maleKidCount} / {recording.femaleKidCount}
                  </TableCell>
                  <TableCell>
                    <RecordingSoldBadge sold={recording.sold} />
                  </TableCell>
                  <TableCell>
                    <RecordingSourceBadge source={recording.source} />
                  </TableCell>
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors (the pre-existing `profile-form.tsx` warning is unrelated and expected).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/format-date.ts frontend/src/features/recordings/components/recording-badges.tsx "frontend/src/app/(dashboard)/recording/page.tsx"
git commit -m "feat(frontend): show Kondisi/Terjual columns and format recording dates"
```

---

### Task 12: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend test suite one more time**

Run: `cd backend && npx jest`
Expected: all suites pass.

- [ ] **Step 2: Run frontend type-check, lint, and build**

Run:
```bash
cd frontend && npx tsc --noEmit -p tsconfig.json && npm run lint && npm run build
```
Expected: all three succeed with no new errors/warnings.

- [ ] **Step 3: Start both dev servers**

```bash
cd backend && npm run dev
```
(background/separate terminal)
```bash
cd frontend && npm run dev
```
Expected: backend on `http://localhost:5000`, frontend on `http://localhost:3000`.

- [ ] **Step 4: Exercise the form in a browser**

Log in to the dashboard, open **Recording → Tambah Recording**:
- Confirm "Tanggal Recording" shows today's date, disabled, with "Hari ini" checked.
- Uncheck "Hari ini" — the date field becomes editable; pick a different date.
- Confirm "Tanggal Kawin"/"Tanggal Lahir" render as native date pickers (calendar icon, no free-text entry).
- Select a Kondisi (Sehat/Sakit) from the dropdown.
- Select a Status Terjual radio option (Ya/Tidak).
- Fill in the rest, submit, confirm success toast and dialog closes.

- [ ] **Step 5: Verify the table**

Confirm the Recording table shows the new **Kondisi** and **Terjual** badge columns for the row just created, and that **Tanggal Lahir** renders as a formatted date (e.g. `11/07/2026`), not a raw ISO string.

- [ ] **Step 6: Edit the same recording**

Open the edit dialog for the row just created — confirm all fields (including the date pickers, Kondisi, Terjual radio, and Tanggal Recording) are pre-filled correctly from the saved data.

---

## Self-Review Notes

- **Spec coverage:** date pickers (Task 10 Step 6), Kondisi field (Task 10 Step 7, Task 4 for the bot side), Terjual radio (Task 10 Step 7), Tanggal Recording + "Hari ini" checkbox (Task 10 Steps 3–5), export feature — explicitly out of scope for this plan (separate spec per the brainstorming decomposition).
- **Type consistency:** `parseRecordingDate`/`parseSoldStatus`/`parseGoatCondition` (Task 2) are the single source of parsing logic, reused identically by the WhatsApp path (Task 2 Step 3) and the dashboard controller (Task 3 Step 4) — no duplicate parsing logic anywhere.
- **No placeholders:** every step above contains literal file paths, literal code, and literal shell commands with expected output.

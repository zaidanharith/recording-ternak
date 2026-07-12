# Export Excel/PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any logged-in admin export Recording, Kambing (Goat), and Peternak (Farmer) data as Excel or PDF, with their own filter/sort options independent of the table's own filters.

**Architecture:** Server-side generation. Frontend opens a dialog per resource (filters + format choice), calls a new `GET /api/<resource>/export` endpoint with `responseType: "blob"`, backend queries Prisma without pagination (capped at 5000 rows), builds the file with `exceljs` (Excel) or `pdfkit` (PDF, with a Bumdes logo letterhead), and streams it back as an attachment; the frontend triggers a browser download from the blob.

**Tech Stack:** Express + Prisma (backend), Next.js App Router + Axios + shadcn/ui (frontend), `exceljs` + `pdfkit` (new backend deps).

## Global Constraints

- Every export endpoint is capped at `take: 5000` rows — a safety cap, not a UX-facing limit.
- Export endpoints require only `authMiddleware` (no `requireRole`) — every logged-in role (SUPERADMIN, ADMIN, VIEWER) can export, since it's read-only.
- PDF uses `pdfkit`, not `pdfmake` — no external `.ttf` font bundling needed, tables are drawn manually.
- No comments in any generated code.
- All user-facing labels/messages are Indonesian, matching the existing controllers' style.
- The frontend has no test runner configured (no `test` script, no Jest/Vitest deps) — do not add one as part of this feature. Frontend tasks are verified manually (dev server + browser), not with automated tests.
- Backend tests follow the existing convention: `jest.mock('../../lib/prisma', () => ({...}))` for repository tests, `jest.mock('../../repositories/x.repository')` for controller tests, files under `__tests__/` next to the module they test.

---

### Task 1: Date-range helper + backend dependencies

**Files:**
- Create: `backend/src/lib/date-range.js`
- Test: `backend/src/lib/__tests__/date-range.test.js`
- Modify: `backend/package.json` (add `exceljs`, `pdfkit`)

**Interfaces:**
- Produces: `buildDateRangeFilter(startDate?: string, endDate?: string): { gte?: Date, lt?: Date } | undefined` — `startDate`/`endDate` are `YYYY-MM-DD` strings. Used by Task 3 and Task 4's repository functions to build a Prisma `where` range on a date field. `endDate` is turned into an **exclusive** `lt` one day later, so the whole end day is included regardless of stored time-of-day.

- [ ] **Step 1: Install the new backend dependencies**

Run: `cd backend && npm install exceljs pdfkit`
Expected: `package.json` dependencies gain `"exceljs"` and `"pdfkit"` entries; `package-lock.json` updates.

- [ ] **Step 2: Write the failing test for `buildDateRangeFilter`**

Create `backend/src/lib/__tests__/date-range.test.js`:

```js
const { buildDateRangeFilter } = require('../date-range');

describe('buildDateRangeFilter', () => {
  it('returns undefined when neither startDate nor endDate is given', () => {
    expect(buildDateRangeFilter(undefined, undefined)).toBeUndefined();
  });

  it('builds a gte filter from startDate only', () => {
    const result = buildDateRangeFilter('2026-07-01', undefined);
    expect(result.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(result.lt).toBeUndefined();
  });

  it('builds an exclusive lt filter one day after endDate', () => {
    const result = buildDateRangeFilter(undefined, '2026-07-10');
    expect(result.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
    expect(result.gte).toBeUndefined();
  });

  it('builds both gte and lt when both dates are given', () => {
    const result = buildDateRangeFilter('2026-07-01', '2026-07-10');
    expect(result.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(result.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
  });
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `cd backend && npx jest src/lib/__tests__/date-range.test.js`
Expected: FAIL with "Cannot find module '../date-range'"

- [ ] **Step 3: Implement `buildDateRangeFilter`**

Create `backend/src/lib/date-range.js`:

```js
const buildDateRangeFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return undefined;

  const range = {};
  if (startDate) range.gte = new Date(`${startDate}T00:00:00`);
  if (endDate) {
    const end = new Date(`${endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);
    range.lt = end;
  }
  return range;
};

module.exports = { buildDateRangeFilter };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/lib/__tests__/date-range.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/date-range.js backend/src/lib/__tests__/date-range.test.js backend/package.json backend/package-lock.json
git commit -m "feat(backend): add date-range filter helper and export deps"
```

---

### Task 2: Logo asset + export.service.js (Excel/PDF buffer builders)

**Files:**
- Create: `backend/src/assets/logo-bumdes.png` (copy of `frontend/public/logo-bumdes.png`)
- Create: `backend/src/services/export.service.js`
- Test: `backend/src/services/__tests__/export.service.test.js`

**Interfaces:**
- Consumes: none (this is the lowest-level export building block).
- Produces:
  - `formatDateId(value: string | Date | null | undefined): string` — `"-"` for empty, else `id-ID` locale date string (`Asia/Jakarta`).
  - `buildExcelBuffer({ sheetName: string, columns: { header: string, key: string, width?: number }[], rows: Record<string, string | number>[] }): Promise<Buffer>`
  - `buildPdfBuffer({ title: string, columns: { header: string, key: string }[], rows: Record<string, string | number>[] }): Promise<Buffer>`
  - `sendExportFile(res, { format: "xlsx" | "pdf", resourceName: string, title: string, columns, rows }): Promise<void>` — sets `Content-Type`/`Content-Disposition` and calls `res.send(buffer)`. Used by every controller task below (3, 4, 5).

- [ ] **Step 1: Copy the logo asset**

Run: `mkdir -p backend/src/assets && cp frontend/public/logo-bumdes.png backend/src/assets/logo-bumdes.png`
Expected: `backend/src/assets/logo-bumdes.png` exists.

- [ ] **Step 2: Write the failing tests**

Create `backend/src/services/__tests__/export.service.test.js`:

```js
const ExcelJS = require('exceljs');
const {
  formatDateId,
  buildExcelBuffer,
  buildPdfBuffer,
  sendExportFile,
} = require('../export.service');

describe('formatDateId', () => {
  it('returns "-" for null/undefined/empty', () => {
    expect(formatDateId(null)).toBe('-');
    expect(formatDateId(undefined)).toBe('-');
    expect(formatDateId('')).toBe('-');
  });

  it('formats a date string in id-ID locale', () => {
    expect(formatDateId('2026-07-11T00:00:00.000Z')).toBe(
      new Date('2026-07-11T00:00:00.000Z').toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
    );
  });
});

describe('buildExcelBuffer', () => {
  it('produces a valid xlsx buffer with header and data rows', async () => {
    const buffer = await buildExcelBuffer({
      sheetName: 'Recording',
      columns: [
        { header: 'Nama', key: 'name', width: 20 },
        { header: 'Umur', key: 'age', width: 10 },
      ],
      rows: [{ name: 'Budi', age: 30 }],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Recording');
    expect(sheet.getRow(1).getCell(1).value).toBe('Nama');
    expect(sheet.getRow(2).getCell(1).value).toBe('Budi');
    expect(sheet.getRow(2).getCell(2).value).toBe(30);
  });
});

describe('buildPdfBuffer', () => {
  it('produces a non-empty PDF buffer', async () => {
    const buffer = await buildPdfBuffer({
      title: 'Laporan Test',
      columns: [{ header: 'Nama', key: 'name' }],
      rows: [{ name: 'Budi' }],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('paginates onto a new page when rows overflow', async () => {
    const rows = Array.from({ length: 80 }, (_, index) => ({ name: `Kambing ${index}` }));
    const buffer = await buildPdfBuffer({
      title: 'Laporan Panjang',
      columns: [{ header: 'Nama', key: 'name' }],
      rows,
    });

    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});

describe('sendExportFile', () => {
  const buildRes = () => ({
    setHeader: jest.fn(),
    send: jest.fn(),
  });

  it('sends an xlsx file with correct headers', async () => {
    const res = buildRes();
    await sendExportFile(res, {
      format: 'xlsx',
      resourceName: 'recording',
      title: 'Laporan Recording',
      columns: [{ header: 'Nama', key: 'name' }],
      rows: [{ name: 'Budi' }],
    });

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('recording-')
    );
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('sends a pdf file with correct headers', async () => {
    const res = buildRes();
    await sendExportFile(res, {
      format: 'pdf',
      resourceName: 'recording',
      title: 'Laporan Recording',
      columns: [{ header: 'Nama', key: 'name' }],
      rows: [{ name: 'Budi' }],
    });

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('recording-')
    );
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });
});
```

- [ ] **Step 2b: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/__tests__/export.service.test.js`
Expected: FAIL with "Cannot find module '../export.service'"

- [ ] **Step 3: Implement `export.service.js`**

Create `backend/src/services/export.service.js`:

```js
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const LOGO_PATH = path.join(__dirname, '../assets/logo-bumdes.png');

const formatDateId = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
};

const buildExcelBuffer = async ({ sheetName, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || Math.max(column.header.length + 2, 12),
  }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildPdfBuffer = ({ title, columns, rows }) => {
  return new Promise((resolve, reject) => {
    const isLandscape = columns.length > 6;
    const doc = new PDFDocument({
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      margin: 40,
    });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const startX = 40;
    const usableWidth = doc.page.width - startX * 2;
    const colWidth = usableWidth / columns.length;
    const rowHeight = 20;
    const bottomMargin = 60;

    const drawHeader = () => {
      let y = 40;
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, startX, y, { width: 45 });
      }
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(title, startX + 55, y, { width: usableWidth - 55 });
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Diekspor pada ${formatDateId(new Date())}`, startX + 55, y + 20, {
          width: usableWidth - 55,
        });
      doc.fillColor('#000000');
      return y + 65;
    };

    const drawRow = (y, values, isHeader) => {
      doc.fontSize(9).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
      values.forEach((value, index) => {
        doc.text(String(value ?? '-'), startX + index * colWidth, y, {
          width: colWidth,
          ellipsis: true,
        });
      });
    };

    let y = drawHeader();
    drawRow(y, columns.map((column) => column.header), true);
    y += rowHeight - 5;
    doc
      .moveTo(startX, y)
      .lineTo(doc.page.width - startX, y)
      .strokeColor('#cccccc')
      .stroke();
    y += 8;

    rows.forEach((row) => {
      if (y > doc.page.height - bottomMargin) {
        doc.addPage();
        y = 40;
      }
      drawRow(y, columns.map((column) => row[column.key]), false);
      y += rowHeight;
    });

    doc.end();
  });
};

const sendExportFile = async (res, { format, resourceName, title, columns, rows }) => {
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (format === 'xlsx') {
    const buffer = await buildExcelBuffer({ sheetName: title, columns, rows });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${resourceName}-${dateSuffix}.xlsx"`);
    return res.send(buffer);
  }

  const buffer = await buildPdfBuffer({ title, columns, rows });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${resourceName}-${dateSuffix}.pdf"`);
  return res.send(buffer);
};

module.exports = {
  formatDateId,
  buildExcelBuffer,
  buildPdfBuffer,
  sendExportFile,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/__tests__/export.service.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/assets/logo-bumdes.png backend/src/services/export.service.js backend/src/services/__tests__/export.service.test.js
git commit -m "feat(backend): add export.service with Excel/PDF buffer builders"
```

---

### Task 3: Recording export (repository + controller + route)

**Files:**
- Modify: `backend/src/repositories/recording.repository.js`
- Test: `backend/src/repositories/__tests__/recording.repository.test.js` (append)
- Modify: `backend/src/controllers/recording.controller.js`
- Test: `backend/src/controllers/__tests__/recording.controller.test.js` (append)
- Modify: `backend/src/routes/recording.route.js`

**Interfaces:**
- Consumes: `buildDateRangeFilter` (Task 1), `sendExportFile`/`formatDateId` (Task 2).
- Produces: `recordingRepository.exportRecordings({ status?, sold?, condition?, source?, startDate?, endDate?, sortBy, sortDir }): Promise<Recording[]>` (each recording includes `goat.farmer`); `exports.exportRecordings` controller handling `GET /api/recordings/export`.

- [ ] **Step 1: Write the failing repository test**

Append to `backend/src/repositories/__tests__/recording.repository.test.js` (add `findMany` to the existing `jest.mock('../../lib/prisma', ...)` at the top — change it to):

```js
jest.mock('../../lib/prisma', () => ({
  recording: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}));
```

Then append at the end of the file:

```js
describe('exportRecordings', () => {
  const { exportRecordings } = require('../recording.repository');

  it('applies status/sold/condition/source filters, caps rows, and sorts by birthDate', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({
      status: 'FINAL',
      sold: 'YA',
      condition: 'SEHAT',
      source: 'MANUAL',
      sortBy: 'birthDate',
      sortDir: 'desc',
    });

    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'FINAL', sold: 'YA', condition: 'SEHAT', source: 'MANUAL' },
        orderBy: { birthDate: 'desc' },
        take: 5000,
      })
    );
  });

  it('sorts by nested farmer name when sortBy is farmer', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({ sortBy: 'farmer', sortDir: 'asc' });

    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { goat: { farmer: { name: 'asc' } } } })
    );
  });

  it('sorts by nested goat ear tag number when sortBy is goat', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({ sortBy: 'goat', sortDir: 'asc' });

    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { goat: { earTagNumber: 'asc' } } })
    );
  });

  it('applies a recordingDate range filter', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      sortBy: 'birthDate',
      sortDir: 'desc',
    });

    const callArgs = prisma.recording.findMany.mock.calls[0][0];
    expect(callArgs.where.recordingDate.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(callArgs.where.recordingDate.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
  });
});
```

- [ ] **Step 1b: Run test to verify it fails**

Run: `cd backend && npx jest src/repositories/__tests__/recording.repository.test.js`
Expected: FAIL — `exportRecordings is not a function`

- [ ] **Step 2: Implement `exportRecordings` in the repository**

In `backend/src/repositories/recording.repository.js`, add near the top (after the existing `require`):

```js
const { buildDateRangeFilter } = require('../lib/date-range');
```

Add before `module.exports`:

```js
const RECORDING_EXPORT_SORT_MAP = {
  goat: (dir) => ({ goat: { earTagNumber: dir } }),
  farmer: (dir) => ({ goat: { farmer: { name: dir } } }),
  birthDate: (dir) => ({ birthDate: dir }),
  source: (dir) => ({ source: dir }),
  status: (dir) => ({ status: dir }),
};

const exportRecordings = async ({ status, sold, condition, source, startDate, endDate, sortBy, sortDir }) => {
  const recordingDateRange = buildDateRangeFilter(startDate, endDate);
  const where = {
    ...(status && { status }),
    ...(sold && { sold }),
    ...(condition && { condition }),
    ...(source && { source }),
    ...(recordingDateRange && { recordingDate: recordingDateRange }),
  };

  return await prisma.recording.findMany({
    where,
    include: { goat: { include: { farmer: true } } },
    orderBy: RECORDING_EXPORT_SORT_MAP[sortBy](sortDir),
    take: 5000,
  });
};
```

Update `module.exports` to include `exportRecordings,`.

- [ ] **Step 3: Run repository test to verify it passes**

Run: `cd backend && npx jest src/repositories/__tests__/recording.repository.test.js`
Expected: PASS (all tests, including 4 new ones)

- [ ] **Step 4: Write the failing controller test**

Append to `backend/src/controllers/__tests__/recording.controller.test.js`:

```js
const exportService = require('../../services/export.service');
jest.mock('../../services/export.service');

describe('exportRecordings', () => {
  const { exportRecordings } = require('../recording.controller');

  it('rejects an invalid format', async () => {
    const req = { query: { format: 'csv' } };
    const res = buildRes();

    await exportRecordings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.exportRecordings).not.toHaveBeenCalled();
  });

  it('rejects an invalid status filter', async () => {
    const req = { query: { format: 'xlsx', status: 'INVALID' } };
    const res = buildRes();

    await exportRecordings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps repository rows to export columns and sends the file', async () => {
    recordingRepository.exportRecordings.mockResolvedValue([
      {
        goat: { earTagNumber: 12, farmer: { name: 'Budi' } },
        birthDate: '2026-01-01T00:00:00.000Z',
        condition: 'SEHAT',
        maleKidCount: '1',
        femaleKidCount: '0',
        sold: 'YA',
        source: 'MANUAL',
        status: 'FINAL',
      },
    ]);

    const req = { query: { format: 'xlsx' } };
    const res = buildRes();

    await exportRecordings(req, res);

    expect(recordingRepository.exportRecordings).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'birthDate', sortDir: 'desc' })
    );
    expect(exportService.sendExportFile).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        format: 'xlsx',
        resourceName: 'recording',
        rows: [
          expect.objectContaining({
            earTagNumber: 12,
            farmerName: 'Budi',
            condition: 'Sehat',
            sold: 'Ya',
            source: 'Manual',
            status: 'Final',
          }),
        ],
      })
    );
  });
});
```

- [ ] **Step 4b: Run test to verify it fails**

Run: `cd backend && npx jest src/controllers/__tests__/recording.controller.test.js`
Expected: FAIL — `exportRecordings is not a function`

- [ ] **Step 5: Implement `exportRecordings` controller**

In `backend/src/controllers/recording.controller.js`, add near the top:

```js
const exportService = require('../services/export.service');
```

Add after `RECORDING_STATUSES`:

```js
const EXPORT_FORMATS = ['xlsx', 'pdf'];
const SOLD_STATUSES = ['YA', 'TIDAK'];
const GOAT_CONDITIONS = ['SEHAT', 'SAKIT'];
const RECORDING_SOURCES = ['WA', 'MANUAL'];
const RECORDING_SORT_FIELDS = ['goat', 'farmer', 'birthDate', 'source', 'status'];
const SORT_DIRECTIONS = ['asc', 'desc'];

const SOLD_LABELS = { YA: 'Ya', TIDAK: 'Tidak' };
const CONDITION_LABELS = { SEHAT: 'Sehat', SAKIT: 'Sakit' };
const SOURCE_LABELS = { WA: 'WhatsApp', MANUAL: 'Manual' };
const STATUS_LABELS = { PERLU_REVIEW: 'Perlu Review', FINAL: 'Final' };
```

Add at the end of the file (before the final `module.exports` line, if any — this file uses `exports.x = ` so just append):

```js
exports.exportRecordings = async (req, res) => {
  try {
    const { format, status, sold, condition, source, startDate, endDate } = req.query;
    const sortBy = req.query.sortBy || 'birthDate';
    const sortDir = req.query.sortDir || 'desc';

    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: `format harus salah satu dari: ${EXPORT_FORMATS.join(', ')}.` });
    }
    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.` });
    }
    if (sold && !SOLD_STATUSES.includes(sold)) {
      return res.status(400).json({ success: false, message: `sold harus salah satu dari: ${SOLD_STATUSES.join(', ')}.` });
    }
    if (condition && !GOAT_CONDITIONS.includes(condition)) {
      return res.status(400).json({ success: false, message: `condition harus salah satu dari: ${GOAT_CONDITIONS.join(', ')}.` });
    }
    if (source && !RECORDING_SOURCES.includes(source)) {
      return res.status(400).json({ success: false, message: `source harus salah satu dari: ${RECORDING_SOURCES.join(', ')}.` });
    }
    if (!RECORDING_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: `sortBy harus salah satu dari: ${RECORDING_SORT_FIELDS.join(', ')}.` });
    }
    if (!SORT_DIRECTIONS.includes(sortDir)) {
      return res.status(400).json({ success: false, message: `sortDir harus salah satu dari: ${SORT_DIRECTIONS.join(', ')}.` });
    }

    const recordings = await recordingRepository.exportRecordings({
      status, sold, condition, source, startDate, endDate, sortBy, sortDir,
    });

    const columns = [
      { header: 'No. Telinga Kambing', key: 'earTagNumber', width: 20 },
      { header: 'Peternak', key: 'farmerName', width: 24 },
      { header: 'Tanggal Lahir', key: 'birthDate', width: 16 },
      { header: 'Kondisi', key: 'condition', width: 12 },
      { header: 'Anak Jantan', key: 'maleKidCount', width: 12 },
      { header: 'Anak Betina', key: 'femaleKidCount', width: 12 },
      { header: 'Terjual', key: 'sold', width: 10 },
      { header: 'Sumber', key: 'source', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
    ];

    const rows = recordings.map((recording) => ({
      earTagNumber: recording.goat?.earTagNumber ?? '-',
      farmerName: recording.goat?.farmer?.name ?? '-',
      birthDate: exportService.formatDateId(recording.birthDate),
      condition: recording.condition ? CONDITION_LABELS[recording.condition] : '-',
      maleKidCount: recording.maleKidCount,
      femaleKidCount: recording.femaleKidCount,
      sold: recording.sold ? SOLD_LABELS[recording.sold] : '-',
      source: SOURCE_LABELS[recording.source],
      status: STATUS_LABELS[recording.status],
    }));

    await exportService.sendExportFile(res, {
      format,
      resourceName: 'recording',
      title: 'Laporan Data Recording',
      columns,
      rows,
    });
  } catch (error) {
    console.error('Export Recordings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengekspor data recording.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 6: Run controller test to verify it passes**

Run: `cd backend && npx jest src/controllers/__tests__/recording.controller.test.js`
Expected: PASS (all tests, including 3 new ones)

- [ ] **Step 7: Wire the route**

In `backend/src/routes/recording.route.js`, update the destructured import and add the route **before** `/:id`:

```js
const {
  listRecordings, getRecording, createRecording, updateRecording, deleteRecording, exportRecordings,
} = require('../controllers/recording.controller');
```

```js
router.get('/', listRecordings);
router.get('/export', exportRecordings);
router.get('/:id', getRecording);
```

- [ ] **Step 8: Run the full backend test suite**

Run: `cd backend && npx jest`
Expected: PASS (no regressions)

- [ ] **Step 9: Commit**

```bash
git add backend/src/repositories/recording.repository.js backend/src/repositories/__tests__/recording.repository.test.js backend/src/controllers/recording.controller.js backend/src/controllers/__tests__/recording.controller.test.js backend/src/routes/recording.route.js
git commit -m "feat(backend): add GET /api/recordings/export"
```

---

### Task 4: Goat export (repository + controller + route)

**Files:**
- Modify: `backend/src/repositories/goat.repository.js`
- Create: `backend/src/repositories/__tests__/goat.repository.test.js`
- Modify: `backend/src/controllers/goat.controller.js`
- Create: `backend/src/controllers/__tests__/goat.controller.test.js`
- Modify: `backend/src/routes/goat.route.js`

**Interfaces:**
- Consumes: `buildDateRangeFilter` (Task 1), `sendExportFile`/`formatDateId` (Task 2).
- Produces: `goatRepository.exportGoats({ farmerId?, startDate?, endDate?, sortBy, sortDir }): Promise<Goat[]>` (each goat includes `farmer`); `exports.exportGoats` controller handling `GET /api/goats/export`.

- [ ] **Step 1: Write the failing repository test**

Create `backend/src/repositories/__tests__/goat.repository.test.js`:

```js
const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  goat: {
    findMany: jest.fn(),
  },
}));

const { exportGoats } = require('../goat.repository');

describe('exportGoats', () => {
  it('applies a farmerId filter, caps rows, and sorts by createdAt', async () => {
    prisma.goat.findMany.mockResolvedValue([]);

    await exportGoats({ farmerId: 'f1', sortBy: 'createdAt', sortDir: 'desc' });

    expect(prisma.goat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { farmerId: 'f1' },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      })
    );
  });

  it('sorts by nested farmer name when sortBy is farmer', async () => {
    prisma.goat.findMany.mockResolvedValue([]);

    await exportGoats({ sortBy: 'farmer', sortDir: 'asc' });

    expect(prisma.goat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { farmer: { name: 'asc' } } })
    );
  });

  it('sorts by earTagNumber directly', async () => {
    prisma.goat.findMany.mockResolvedValue([]);

    await exportGoats({ sortBy: 'earTagNumber', sortDir: 'asc' });

    expect(prisma.goat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { earTagNumber: 'asc' } })
    );
  });

  it('applies a createdAt range filter', async () => {
    prisma.goat.findMany.mockResolvedValue([]);

    await exportGoats({ startDate: '2026-07-01', endDate: '2026-07-10', sortBy: 'createdAt', sortDir: 'desc' });

    const callArgs = prisma.goat.findMany.mock.calls[0][0];
    expect(callArgs.where.createdAt.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(callArgs.where.createdAt.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
  });
});
```

- [ ] **Step 1b: Run test to verify it fails**

Run: `cd backend && npx jest src/repositories/__tests__/goat.repository.test.js`
Expected: FAIL — `exportGoats is not a function`

- [ ] **Step 2: Implement `exportGoats` in the repository**

In `backend/src/repositories/goat.repository.js`, add near the top:

```js
const { buildDateRangeFilter } = require('../lib/date-range');
```

Add before `module.exports`:

```js
const GOAT_EXPORT_SORT_MAP = {
  earTagNumber: (dir) => ({ earTagNumber: dir }),
  farmer: (dir) => ({ farmer: { name: dir } }),
  createdAt: (dir) => ({ createdAt: dir }),
};

const exportGoats = async ({ farmerId, startDate, endDate, sortBy, sortDir }) => {
  const createdAtRange = buildDateRangeFilter(startDate, endDate);
  const where = {
    ...(farmerId && { farmerId }),
    ...(createdAtRange && { createdAt: createdAtRange }),
  };

  return await prisma.goat.findMany({
    where,
    include: { farmer: true },
    orderBy: GOAT_EXPORT_SORT_MAP[sortBy](sortDir),
    take: 5000,
  });
};
```

Update `module.exports` to include `exportGoats,`.

- [ ] **Step 3: Run repository test to verify it passes**

Run: `cd backend && npx jest src/repositories/__tests__/goat.repository.test.js`
Expected: PASS (4 tests)

- [ ] **Step 4: Write the failing controller test**

Create `backend/src/controllers/__tests__/goat.controller.test.js`:

```js
const goatRepository = require('../../repositories/goat.repository');
jest.mock('../../repositories/goat.repository');

const exportService = require('../../services/export.service');
jest.mock('../../services/export.service');

const { exportGoats } = require('../goat.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('exportGoats', () => {
  it('rejects an invalid format', async () => {
    const req = { query: { format: 'csv' } };
    const res = buildRes();

    await exportGoats(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.exportGoats).not.toHaveBeenCalled();
  });

  it('maps repository rows to export columns and sends the file', async () => {
    goatRepository.exportGoats.mockResolvedValue([
      { earTagNumber: 7, farmer: { name: 'Budi' }, createdAt: '2026-01-01T00:00:00.000Z' },
    ]);

    const req = { query: { format: 'pdf' } };
    const res = buildRes();

    await exportGoats(req, res);

    expect(goatRepository.exportGoats).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'createdAt', sortDir: 'desc' })
    );
    expect(exportService.sendExportFile).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        format: 'pdf',
        resourceName: 'goat',
        rows: [
          expect.objectContaining({ earTagNumber: 7, farmerName: 'Budi' }),
        ],
      })
    );
  });
});
```

- [ ] **Step 4b: Run test to verify it fails**

Run: `cd backend && npx jest src/controllers/__tests__/goat.controller.test.js`
Expected: FAIL — `exportGoats is not a function`

- [ ] **Step 5: Implement `exportGoats` controller**

In `backend/src/controllers/goat.controller.js`, add near the top:

```js
const exportService = require('../services/export.service');
```

Add at the end of the file:

```js
const EXPORT_FORMATS = ['xlsx', 'pdf'];
const GOAT_SORT_FIELDS = ['earTagNumber', 'farmer', 'createdAt'];
const SORT_DIRECTIONS = ['asc', 'desc'];

exports.exportGoats = async (req, res) => {
  try {
    const { format, farmerId, startDate, endDate } = req.query;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir || 'desc';

    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: `format harus salah satu dari: ${EXPORT_FORMATS.join(', ')}.` });
    }
    if (!GOAT_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: `sortBy harus salah satu dari: ${GOAT_SORT_FIELDS.join(', ')}.` });
    }
    if (!SORT_DIRECTIONS.includes(sortDir)) {
      return res.status(400).json({ success: false, message: `sortDir harus salah satu dari: ${SORT_DIRECTIONS.join(', ')}.` });
    }

    const goats = await goatRepository.exportGoats({ farmerId, startDate, endDate, sortBy, sortDir });

    const columns = [
      { header: 'No. Telinga', key: 'earTagNumber', width: 16 },
      { header: 'Peternak', key: 'farmerName', width: 24 },
      { header: 'Terdaftar', key: 'createdAt', width: 16 },
    ];

    const rows = goats.map((goat) => ({
      earTagNumber: goat.earTagNumber,
      farmerName: goat.farmer?.name ?? '-',
      createdAt: exportService.formatDateId(goat.createdAt),
    }));

    await exportService.sendExportFile(res, {
      format,
      resourceName: 'goat',
      title: 'Laporan Data Kambing',
      columns,
      rows,
    });
  } catch (error) {
    console.error('Export Goats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengekspor data kambing.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 6: Run controller test to verify it passes**

Run: `cd backend && npx jest src/controllers/__tests__/goat.controller.test.js`
Expected: PASS (2 tests)

- [ ] **Step 7: Wire the route**

In `backend/src/routes/goat.route.js`, update the destructured import and add the route before `/:id` (after `/next-ear-tag`):

```js
const {
  listGoats, getGoat, createGoat, updateGoat, deleteGoat, getNextEarTagNumber, exportGoats,
} = require('../controllers/goat.controller');
```

```js
router.get('/', listGoats);
router.get('/next-ear-tag', getNextEarTagNumber);
router.get('/export', exportGoats);
router.get('/:id', getGoat);
```

- [ ] **Step 8: Run the full backend test suite**

Run: `cd backend && npx jest`
Expected: PASS (no regressions)

- [ ] **Step 9: Commit**

```bash
git add backend/src/repositories/goat.repository.js backend/src/repositories/__tests__/goat.repository.test.js backend/src/controllers/goat.controller.js backend/src/controllers/__tests__/goat.controller.test.js backend/src/routes/goat.route.js
git commit -m "feat(backend): add GET /api/goats/export"
```

---

### Task 5: Farmer export (repository + controller + route)

**Files:**
- Modify: `backend/src/repositories/farmer.repository.js`
- Create: `backend/src/repositories/__tests__/farmer.repository.test.js`
- Modify: `backend/src/controllers/farmer.controller.js`
- Create: `backend/src/controllers/__tests__/farmer.controller.test.js`
- Modify: `backend/src/routes/farmer.route.js`

**Interfaces:**
- Consumes: `sendExportFile`/`formatDateId` not needed for dates here (Farmer has no exported date column) — only `sendExportFile` from Task 2.
- Produces: `farmerRepository.exportFarmers({ search?, sortBy, sortDir }): Promise<Farmer[]>`; `exports.exportFarmers` controller handling `GET /api/farmers/export`.

- [ ] **Step 1: Write the failing repository test**

Create `backend/src/repositories/__tests__/farmer.repository.test.js`:

```js
const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  farmer: {
    findMany: jest.fn(),
  },
}));

const { exportFarmers } = require('../farmer.repository');

describe('exportFarmers', () => {
  it('applies a search filter across name and whatsappPhone, caps rows, and sorts by name', async () => {
    prisma.farmer.findMany.mockResolvedValue([]);

    await exportFarmers({ search: 'budi', sortBy: 'name', sortDir: 'asc' });

    expect(prisma.farmer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'budi', mode: 'insensitive' } },
            { whatsappPhone: { contains: 'budi' } },
          ],
        },
        orderBy: { name: 'asc' },
        take: 5000,
      })
    );
  });

  it('uses an empty where filter when search is not given', async () => {
    prisma.farmer.findMany.mockResolvedValue([]);

    await exportFarmers({ sortBy: 'whatsappPhone', sortDir: 'desc' });

    expect(prisma.farmer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { whatsappPhone: 'desc' } })
    );
  });

  it('sorts by address', async () => {
    prisma.farmer.findMany.mockResolvedValue([]);

    await exportFarmers({ sortBy: 'address', sortDir: 'asc' });

    expect(prisma.farmer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { address: 'asc' } })
    );
  });
});
```

- [ ] **Step 1b: Run test to verify it fails**

Run: `cd backend && npx jest src/repositories/__tests__/farmer.repository.test.js`
Expected: FAIL — `exportFarmers is not a function`

- [ ] **Step 2: Implement `exportFarmers` in the repository**

In `backend/src/repositories/farmer.repository.js`, add before `module.exports`:

```js
const FARMER_EXPORT_SORT_MAP = {
  name: (dir) => ({ name: dir }),
  whatsappPhone: (dir) => ({ whatsappPhone: dir }),
  address: (dir) => ({ address: dir }),
};

const exportFarmers = async ({ search, sortBy, sortDir }) => {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { whatsappPhone: { contains: search } },
        ],
      }
    : {};

  return await prisma.farmer.findMany({
    where,
    orderBy: FARMER_EXPORT_SORT_MAP[sortBy](sortDir),
    take: 5000,
  });
};
```

Update `module.exports` to include `exportFarmers,`.

- [ ] **Step 3: Run repository test to verify it passes**

Run: `cd backend && npx jest src/repositories/__tests__/farmer.repository.test.js`
Expected: PASS (3 tests)

- [ ] **Step 4: Write the failing controller test**

Create `backend/src/controllers/__tests__/farmer.controller.test.js`:

```js
const farmerRepository = require('../../repositories/farmer.repository');
jest.mock('../../repositories/farmer.repository');

const exportService = require('../../services/export.service');
jest.mock('../../services/export.service');

const { exportFarmers } = require('../farmer.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe('exportFarmers', () => {
  it('rejects an invalid format', async () => {
    const req = { query: { format: 'csv' } };
    const res = buildRes();

    await exportFarmers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(farmerRepository.exportFarmers).not.toHaveBeenCalled();
  });

  it('maps repository rows to export columns and sends the file', async () => {
    farmerRepository.exportFarmers.mockResolvedValue([
      { name: 'Budi', whatsappPhone: '628123456789', address: 'Desa Besuki' },
    ]);

    const req = { query: { format: 'xlsx' } };
    const res = buildRes();

    await exportFarmers(req, res);

    expect(farmerRepository.exportFarmers).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'name', sortDir: 'asc' })
    );
    expect(exportService.sendExportFile).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        format: 'xlsx',
        resourceName: 'farmer',
        rows: [
          { name: 'Budi', whatsappPhone: '628123456789', address: 'Desa Besuki' },
        ],
      })
    );
  });
});
```

- [ ] **Step 4b: Run test to verify it fails**

Run: `cd backend && npx jest src/controllers/__tests__/farmer.controller.test.js`
Expected: FAIL — `exportFarmers is not a function`

- [ ] **Step 5: Implement `exportFarmers` controller**

In `backend/src/controllers/farmer.controller.js`, add near the top:

```js
const exportService = require('../services/export.service');
```

Add at the end of the file:

```js
const EXPORT_FORMATS = ['xlsx', 'pdf'];
const FARMER_SORT_FIELDS = ['name', 'whatsappPhone', 'address'];
const SORT_DIRECTIONS = ['asc', 'desc'];

exports.exportFarmers = async (req, res) => {
  try {
    const { format, search } = req.query;
    const sortBy = req.query.sortBy || 'name';
    const sortDir = req.query.sortDir || 'asc';

    if (!EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, message: `format harus salah satu dari: ${EXPORT_FORMATS.join(', ')}.` });
    }
    if (!FARMER_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({ success: false, message: `sortBy harus salah satu dari: ${FARMER_SORT_FIELDS.join(', ')}.` });
    }
    if (!SORT_DIRECTIONS.includes(sortDir)) {
      return res.status(400).json({ success: false, message: `sortDir harus salah satu dari: ${SORT_DIRECTIONS.join(', ')}.` });
    }

    const farmers = await farmerRepository.exportFarmers({ search, sortBy, sortDir });

    const columns = [
      { header: 'Nama', key: 'name', width: 24 },
      { header: 'Nomor WhatsApp', key: 'whatsappPhone', width: 20 },
      { header: 'Alamat', key: 'address', width: 30 },
    ];

    const rows = farmers.map((farmer) => ({
      name: farmer.name,
      whatsappPhone: farmer.whatsappPhone,
      address: farmer.address,
    }));

    await exportService.sendExportFile(res, {
      format,
      resourceName: 'farmer',
      title: 'Laporan Data Peternak',
      columns,
      rows,
    });
  } catch (error) {
    console.error('Export Farmers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengekspor data peternak.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 6: Run controller test to verify it passes**

Run: `cd backend && npx jest src/controllers/__tests__/farmer.controller.test.js`
Expected: PASS (2 tests)

- [ ] **Step 7: Wire the route**

In `backend/src/routes/farmer.route.js`, update the destructured import and add the route before `/:id`:

```js
const {
  listFarmers, getFarmer, createFarmer, updateFarmer, deleteFarmer,
  getFarmerChatMessages, sendReminder, exportFarmers,
} = require('../controllers/farmer.controller');
```

```js
router.get('/', listFarmers);
router.get('/export', exportFarmers);
router.get('/:id', getFarmer);
```

- [ ] **Step 8: Run the full backend test suite**

Run: `cd backend && npx jest`
Expected: PASS (no regressions)

- [ ] **Step 9: Commit**

```bash
git add backend/src/repositories/farmer.repository.js backend/src/repositories/__tests__/farmer.repository.test.js backend/src/controllers/farmer.controller.js backend/src/controllers/__tests__/farmer.controller.test.js backend/src/routes/farmer.route.js
git commit -m "feat(backend): add GET /api/farmers/export"
```

---

### Task 6: Frontend — download util + shared ExportDialog

**Files:**
- Create: `frontend/src/lib/download-file.ts`
- Create: `frontend/src/components/common/export-dialog.tsx`

**Interfaces:**
- Produces:
  - `downloadBlob(blob: Blob, filename: string): void`
  - `type ExportFormat = "xlsx" | "pdf"`
  - `ExportDialog` component, props: `{ title: string; format: ExportFormat; onFormatChange: (format: ExportFormat) => void; isExporting: boolean; onExport: () => Promise<boolean>; children: React.ReactNode }`. Renders a "Export" trigger button, a format radio choice, `children` as extra filter fields, and a submit button. Closes itself when `onExport` resolves `true`.

- [ ] **Step 1: Create the download util**

Create `frontend/src/lib/download-file.ts`:

```ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create the shared `ExportDialog` component**

Create `frontend/src/components/common/export-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type ExportFormat = "xlsx" | "pdf";

interface ExportDialogProps {
  title: string;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  isExporting: boolean;
  onExport: () => Promise<boolean>;
  children: React.ReactNode;
}

export function ExportDialog({
  title,
  format,
  onFormatChange,
  isExporting,
  onExport,
  children,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    const success = await onExport();
    if (success) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FiDownload className="size-4" />
            Export
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => onFormatChange(value as ExportFormat)}
              className="flex flex-row gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="xlsx" />
                Excel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="pdf" />
                PDF
              </label>
            </RadioGroup>
          </div>
          {children}
        </div>
        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Memproses..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Manual check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors from these two files (they aren't imported anywhere yet, so this mostly checks syntax).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/download-file.ts frontend/src/components/common/export-dialog.tsx
git commit -m "feat(frontend): add download util and shared ExportDialog"
```

---

### Task 7: Frontend — export types and service functions

**Files:**
- Modify: `frontend/src/types/recording.ts`
- Modify: `frontend/src/types/goat.ts`
- Modify: `frontend/src/types/farmer.ts`
- Modify: `frontend/src/services/recording.service.ts`
- Modify: `frontend/src/services/goat.service.ts`
- Modify: `frontend/src/services/farmer.service.ts`

**Interfaces:**
- Consumes: `api` from `@/lib/axios` (existing).
- Produces:
  - `ExportRecordingsQuery` type + `exportRecordings(query: ExportRecordingsQuery): Promise<Blob>`
  - `ExportGoatsQuery` type + `exportGoats(query: ExportGoatsQuery): Promise<Blob>`
  - `ExportFarmersQuery` type + `exportFarmers(query: ExportFarmersQuery): Promise<Blob>`

- [ ] **Step 1: Add `ExportRecordingsQuery` type**

In `frontend/src/types/recording.ts`, add at the end:

```ts
export interface ExportRecordingsQuery {
  format: "xlsx" | "pdf";
  status?: RecordingStatus;
  sold?: SoldStatus;
  condition?: GoatCondition;
  source?: RecordingSource;
  startDate?: string;
  endDate?: string;
  sortBy?: "goat" | "farmer" | "birthDate" | "source" | "status";
  sortDir?: "asc" | "desc";
}
```

- [ ] **Step 2: Add `exportRecordings` service function**

In `frontend/src/services/recording.service.ts`, add `ExportRecordingsQuery` to the type import and append at the end of the file:

```ts
export async function exportRecordings(
  query: ExportRecordingsQuery,
): Promise<Blob> {
  const { data } = await api.get("/recordings/export", {
    params: query,
    responseType: "blob",
  });
  return data;
}
```

- [ ] **Step 3: Add `ExportGoatsQuery` type**

In `frontend/src/types/goat.ts`, add at the end:

```ts
export interface ExportGoatsQuery {
  format: "xlsx" | "pdf";
  farmerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "earTagNumber" | "farmer" | "createdAt";
  sortDir?: "asc" | "desc";
}
```

- [ ] **Step 4: Add `exportGoats` service function**

In `frontend/src/services/goat.service.ts`, add `ExportGoatsQuery` to the type import and append at the end of the file:

```ts
export async function exportGoats(query: ExportGoatsQuery): Promise<Blob> {
  const { data } = await api.get("/goats/export", {
    params: query,
    responseType: "blob",
  });
  return data;
}
```

- [ ] **Step 5: Add `ExportFarmersQuery` type**

In `frontend/src/types/farmer.ts`, add at the end:

```ts
export interface ExportFarmersQuery {
  format: "xlsx" | "pdf";
  search?: string;
  sortBy?: "name" | "whatsappPhone" | "address";
  sortDir?: "asc" | "desc";
}
```

- [ ] **Step 6: Add `exportFarmers` service function**

In `frontend/src/services/farmer.service.ts`, add `ExportFarmersQuery` to the type import and append at the end of the file:

```ts
export async function exportFarmers(query: ExportFarmersQuery): Promise<Blob> {
  const { data } = await api.get("/farmers/export", {
    params: query,
    responseType: "blob",
  });
  return data;
}
```

- [ ] **Step 7: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/recording.ts frontend/src/types/goat.ts frontend/src/types/farmer.ts frontend/src/services/recording.service.ts frontend/src/services/goat.service.ts frontend/src/services/farmer.service.ts
git commit -m "feat(frontend): add export query types and service functions"
```

---

### Task 8: Frontend — Recording export dialog + page integration

**Files:**
- Create: `frontend/src/features/recordings/components/recording-export-dialog.tsx`
- Modify: `frontend/src/app/(dashboard)/recording/page.tsx`

**Interfaces:**
- Consumes: `ExportDialog`/`ExportFormat` (Task 6), `exportRecordings` + `ExportRecordingsQuery` (Task 7), `downloadBlob` (Task 6).
- Produces: `RecordingExportDialog` component (no props — self-contained), rendered in `RecordingPage`'s `PageHeader` action slot alongside the existing `RecordingFormDialog`.

- [ ] **Step 1: Create `RecordingExportDialog`**

Create `frontend/src/features/recordings/components/recording-export-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ExportDialog, type ExportFormat } from "@/components/common/export-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadBlob } from "@/lib/download-file";
import { exportRecordings } from "@/services/recording.service";
import type {
  ExportRecordingsQuery,
  GoatCondition,
  RecordingSource,
  RecordingStatus,
  SoldStatus,
} from "@/types/recording";

type SortBy = NonNullable<ExportRecordingsQuery["sortBy"]>;
type SortDir = NonNullable<ExportRecordingsQuery["sortDir"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "birthDate", label: "Tanggal Lahir" },
  { value: "goat", label: "Kambing" },
  { value: "farmer", label: "Peternak" },
  { value: "source", label: "Sumber" },
  { value: "status", label: "Status" },
];

export function RecordingExportDialog() {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [status, setStatus] = useState<RecordingStatus | "ALL">("ALL");
  const [sold, setSold] = useState<SoldStatus | "ALL">("ALL");
  const [condition, setCondition] = useState<GoatCondition | "ALL">("ALL");
  const [source, setSource] = useState<RecordingSource | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("birthDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await exportRecordings({
        format,
        status: status === "ALL" ? undefined : status,
        sold: sold === "ALL" ? undefined : sold,
        condition: condition === "ALL" ? undefined : condition,
        source: source === "ALL" ? undefined : source,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDir,
      });
      downloadBlob(blob, `recording-${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success("Recording berhasil diekspor.");
      return true;
    } catch {
      toast.error("Gagal mengekspor data recording.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportDialog
      title="Export Recording"
      format={format}
      onFormatChange={setFormat}
      isExporting={isExporting}
      onExport={handleExport}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as RecordingStatus | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="PERLU_REVIEW">Perlu Review</SelectItem>
              <SelectItem value="FINAL">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Terjual</Label>
          <Select value={sold} onValueChange={(value) => setSold(value as SoldStatus | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="YA">Ya</SelectItem>
              <SelectItem value="TIDAK">Tidak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Kondisi</Label>
          <Select value={condition} onValueChange={(value) => setCondition(value as GoatCondition | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="SEHAT">Sehat</SelectItem>
              <SelectItem value="SAKIT">Sakit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sumber</Label>
          <Select value={source} onValueChange={(value) => setSource(value as RecordingSource | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="WA">WhatsApp</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Dari Tanggal</Label>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sampai Tanggal</Label>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Urutkan Berdasarkan</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Arah Urutan</Label>
          <Select value={sortDir} onValueChange={(value) => setSortDir(value as SortDir)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Naik</SelectItem>
              <SelectItem value="desc">Turun</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ExportDialog>
  );
}
```

- [ ] **Step 2: Integrate into the Recording page**

In `frontend/src/app/(dashboard)/recording/page.tsx`, add the import:

```ts
import { RecordingExportDialog } from "@/features/recordings/components/recording-export-dialog";
```

Replace the `PageHeader` call:

```tsx
      <PageHeader
        title="Recording"
        description="Data recording dari WhatsApp dan input manual"
        action={canManage && <RecordingFormDialog onSaved={() => refetch()} />}
      />
```

with:

```tsx
      <PageHeader
        title="Recording"
        description="Data recording dari WhatsApp dan input manual"
        action={
          <div className="flex items-center gap-2">
            <RecordingExportDialog />
            {canManage && <RecordingFormDialog onSaved={() => refetch()} />}
          </div>
        }
      />
```

- [ ] **Step 3: Manual verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/recording` in the browser, log in.
Expected: an "Export" button appears next to "Tambah Recording". Clicking it opens a dialog with format radio (Excel/PDF), Status/Terjual/Kondisi/Sumber selects, two date inputs, and sort selects. Clicking "Export" with the backend running downloads a file and shows a success toast; the dialog closes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/recordings/components/recording-export-dialog.tsx "frontend/src/app/(dashboard)/recording/page.tsx"
git commit -m "feat(frontend): add recording export dialog"
```

---

### Task 9: Frontend — Goat export dialog + page integration

**Files:**
- Create: `frontend/src/features/goats/components/goat-export-dialog.tsx`
- Modify: `frontend/src/app/(dashboard)/kambing/page.tsx`

**Interfaces:**
- Consumes: `ExportDialog`/`ExportFormat` (Task 6), `exportGoats` + `ExportGoatsQuery` (Task 7), `downloadBlob` (Task 6), `listFarmers` (existing, for the farmer filter dropdown) and `useAsync` (existing).
- Produces: `GoatExportDialog` component (no props), rendered in `KambingPage`'s `PageHeader` action slot alongside `GoatFormDialog`.

- [ ] **Step 1: Create `GoatExportDialog`**

Create `frontend/src/features/goats/components/goat-export-dialog.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ExportDialog, type ExportFormat } from "@/components/common/export-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/use-async";
import { downloadBlob } from "@/lib/download-file";
import { exportGoats } from "@/services/goat.service";
import { listFarmers } from "@/services/farmer.service";
import type { ExportGoatsQuery } from "@/types/goat";

type SortBy = NonNullable<ExportGoatsQuery["sortBy"]>;
type SortDir = NonNullable<ExportGoatsQuery["sortDir"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "createdAt", label: "Terdaftar" },
  { value: "earTagNumber", label: "No. Telinga" },
  { value: "farmer", label: "Peternak" },
];

export function GoatExportDialog() {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [farmerId, setFarmerId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isExporting, setIsExporting] = useState(false);

  const farmersFetcher = useCallback(() => listFarmers({ page: 1, limit: 200 }), []);
  const { data: farmersData } = useAsync(farmersFetcher);

  const handleExport = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await exportGoats({
        format,
        farmerId: farmerId === "ALL" ? undefined : farmerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDir,
      });
      downloadBlob(blob, `kambing-${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success("Kambing berhasil diekspor.");
      return true;
    } catch {
      toast.error("Gagal mengekspor data kambing.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportDialog
      title="Export Kambing"
      format={format}
      onFormatChange={setFormat}
      isExporting={isExporting}
      onExport={handleExport}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Peternak</Label>
          <Select value={farmerId} onValueChange={setFarmerId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Peternak</SelectItem>
              {farmersData?.farmers.map((farmer) => (
                <SelectItem key={farmer.id} value={farmer.id}>
                  {farmer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Dari Tanggal</Label>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sampai Tanggal</Label>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Urutkan Berdasarkan</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Arah Urutan</Label>
          <Select value={sortDir} onValueChange={(value) => setSortDir(value as SortDir)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Naik</SelectItem>
              <SelectItem value="desc">Turun</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ExportDialog>
  );
}
```

- [ ] **Step 2: Integrate into the Kambing page**

In `frontend/src/app/(dashboard)/kambing/page.tsx`, add the import:

```ts
import { GoatExportDialog } from "@/features/goats/components/goat-export-dialog";
```

Replace the `PageHeader` call:

```tsx
      <PageHeader
        title="Kambing"
        description="Kelola data kambing yang terdaftar"
        action={canManage && <GoatFormDialog onSaved={() => refetch()} />}
      />
```

with:

```tsx
      <PageHeader
        title="Kambing"
        description="Kelola data kambing yang terdaftar"
        action={
          <div className="flex items-center gap-2">
            <GoatExportDialog />
            {canManage && <GoatFormDialog onSaved={() => refetch()} />}
          </div>
        }
      />
```

- [ ] **Step 3: Manual verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/kambing`, log in.
Expected: "Export" button next to "Tambah Kambing"; dialog shows Peternak select (Semua Peternak + list), two date inputs, sort selects, and format radio; exporting downloads a file and shows a success toast.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/goats/components/goat-export-dialog.tsx "frontend/src/app/(dashboard)/kambing/page.tsx"
git commit -m "feat(frontend): add goat export dialog"
```

---

### Task 10: Frontend — Farmer export dialog + page integration

**Files:**
- Create: `frontend/src/features/farmers/components/farmer-export-dialog.tsx`
- Modify: `frontend/src/app/(dashboard)/peternak/page.tsx`

**Interfaces:**
- Consumes: `ExportDialog`/`ExportFormat` (Task 6), `exportFarmers` + `ExportFarmersQuery` (Task 7), `downloadBlob` (Task 6).
- Produces: `FarmerExportDialog` component (no props), rendered in `PeternakPage`'s `PageHeader` action slot alongside `FarmerFormDialog`.

- [ ] **Step 1: Create `FarmerExportDialog`**

Create `frontend/src/features/farmers/components/farmer-export-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ExportDialog, type ExportFormat } from "@/components/common/export-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadBlob } from "@/lib/download-file";
import { exportFarmers } from "@/services/farmer.service";
import type { ExportFarmersQuery } from "@/types/farmer";

type SortBy = NonNullable<ExportFarmersQuery["sortBy"]>;
type SortDir = NonNullable<ExportFarmersQuery["sortDir"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "name", label: "Nama" },
  { value: "whatsappPhone", label: "Nomor WhatsApp" },
  { value: "address", label: "Alamat" },
];

export function FarmerExportDialog() {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await exportFarmers({
        format,
        search: search || undefined,
        sortBy,
        sortDir,
      });
      downloadBlob(blob, `peternak-${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success("Peternak berhasil diekspor.");
      return true;
    } catch {
      toast.error("Gagal mengekspor data peternak.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportDialog
      title="Export Peternak"
      format={format}
      onFormatChange={setFormat}
      isExporting={isExporting}
      onExport={handleExport}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Cari Nama atau Nomor WhatsApp</Label>
          <Input
            placeholder="Cari nama atau nomor WhatsApp..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Urutkan Berdasarkan</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Arah Urutan</Label>
            <Select value={sortDir} onValueChange={(value) => setSortDir(value as SortDir)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Naik</SelectItem>
                <SelectItem value="desc">Turun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </ExportDialog>
  );
}
```

- [ ] **Step 2: Integrate into the Peternak page**

In `frontend/src/app/(dashboard)/peternak/page.tsx`, add the import:

```ts
import { FarmerExportDialog } from "@/features/farmers/components/farmer-export-dialog";
```

Replace the `PageHeader` call:

```tsx
      <PageHeader
        title="Peternak"
        description="Kelola data peternak yang terdaftar"
        action={
          canManage && (
            <FarmerFormDialog onSaved={() => refetch()} />
          )
        }
      />
```

with:

```tsx
      <PageHeader
        title="Peternak"
        description="Kelola data peternak yang terdaftar"
        action={
          <div className="flex items-center gap-2">
            <FarmerExportDialog />
            {canManage && <FarmerFormDialog onSaved={() => refetch()} />}
          </div>
        }
      />
```

- [ ] **Step 3: Manual verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/peternak`, log in.
Expected: "Export" button next to "Tambah Peternak"; dialog shows search input, sort selects, format radio; exporting downloads a file and shows a success toast.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/farmers/components/farmer-export-dialog.tsx "frontend/src/app/(dashboard)/peternak/page.tsx"
git commit -m "feat(frontend): add farmer export dialog"
```

---

### Task 11: Full-stack manual verification against the spec

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && npx jest`
Expected: all tests pass, including every `export*` test added in Tasks 1–5.

- [ ] **Step 2: Type-check the frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Start both servers**

Run backend: `cd backend && npm run dev` (port 5000)
Run frontend: `cd frontend && npm run dev` (port 3000)

- [ ] **Step 4: Exercise each acceptance criterion from the spec**

For each of Recording, Kambing, Peternak pages, logged in as a VIEWER-role account (or temporarily check with ADMIN if no VIEWER account exists) and as ADMIN:

- Export button is visible to the logged-in role.
- Dialog opens with the correct filter fields for that resource.
- Selecting Excel and clicking Export downloads a `.xlsx` file; opening it in a spreadsheet app shows a bold header row and the filtered/sorted data.
- Selecting PDF and clicking Export downloads a `.pdf` file; opening it shows the Bumdes logo, report title, export date, and a data table matching the filters.
- Changing a filter (e.g. Status = Final only) changes the exported rows accordingly.
- Changing sort field/direction changes the row order in the exported file.
- A failed export (e.g. stop the backend and try exporting) shows an error toast and keeps the dialog open.

- [ ] **Step 5: Fill in the verification checklist**

Report results using the format from the spec-driven-implementation skill (checked/unchecked per criterion), fixing any gaps found before considering the feature done.

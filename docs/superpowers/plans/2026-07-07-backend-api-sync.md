# Backend API Sync with Frontend Spec — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build out `backend/src` so every feature in `frontend/specs/fitur-website.md` has a corresponding, RESTfully-named, role-protected API endpoint, wiring up the currently-orphaned auth/admin code in the process.

**Architecture:** Follow `backend-expressjs-conventions` exactly — plain JS/CommonJS, one `*.route.js` per resource mounted through a new `routes/api.js` aggregator at `/api`, controllers talk to Prisma through the existing one-repository-per-model pattern (`repositories/*.repository.js`), JWT auth via the existing `auth.middleware.js`, role checks via `role.middleware.js`.

**Tech Stack:** Express 4, Prisma 6 (Postgres), JWT (`jsonwebtoken`), `bcryptjs`, `google-auth-library`, Jest + Supertest (already installed, no new deps needed).

## Global Constraints

- URL naming: plural nouns, kebab-case for multi-word resources, `PATCH` for partial updates, nested action routes for tightly-scoped sub-resources (`/farmers/:id/reminder`, `/farmers/:id/chat-messages`) — per `backend-expressjs-conventions`.
- Response envelope: `{ success, message?, data }` on success, `{ success: false, message, error }` on failure — Indonesian `message` strings, English identifiers/logs.
- Every write route (`POST`/`PATCH`/`DELETE`) requires `authMiddleware` + `requireRole('ADMIN', 'SUPERADMIN')` unless it's account management (`SUPERADMIN` only). Every read route (`GET`) requires only `authMiddleware` so `VIEWER` can read.
- Recording photo (`photoUrl`) is stored as a plain string URL — the client uploads to Cloudinary directly (unsigned upload) and sends the resulting URL. No backend upload/multer code in this pass.
- Do not modify `recording.repository.js`'s existing `createRecording` (used by the live WhatsApp pipeline) beyond what Prisma schema defaults already cover — it must keep working unmodified.
- No comments in generated code.

---

### Task 1: Prisma schema — Recording status/source/photo + SyncStatus model

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `RecordingStatus` enum (`PERLU_REVIEW`, `FINAL`), `RecordingSource` enum (`WA`, `MANUAL`), `Recording.status` (default `PERLU_REVIEW`), `Recording.source` (default `WA`), `Recording.photoUrl` (nullable), `SyncStatus` model (`id`, `lastSyncAt`, `lastStatus`, `lastError`, `updatedAt`).

- [ ] **Step 1: Edit the `Recording` model and add the two enums**

In `backend/prisma/schema.prisma`, add above `model Recording`:

```prisma
enum RecordingStatus {
  PERLU_REVIEW
  FINAL
}

enum RecordingSource {
  WA
  MANUAL
}
```

Inside `model Recording`, add these fields right after `notes`:

```prisma
  status         RecordingStatus @default(PERLU_REVIEW)
  source         RecordingSource @default(WA)
  photoUrl       String?         @map("photo_url")
```

- [ ] **Step 2: Add the `SyncStatus` model**

Append at the end of `schema.prisma`:

```prisma
model SyncStatus {
  id         String    @id @default("singleton")
  lastSyncAt DateTime?
  lastStatus String    @default("BELUM_PERNAH")
  lastError  String?
  updatedAt  DateTime  @updatedAt

  @@map("sync_status")
}
```

- [x] **Step 3: Apply the schema change**

This DB has no migration history (previously managed via `db push`), so `migrate dev` would demand a full reset. Ran `npx prisma db push` instead (from `backend/`): schema synced, `PrismaClient` regenerated, no data loss.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma
git commit -m "feat(backend): add recording status/source/photo and sync status schema"
```

---

### Task 2: Persisted sync status — repository + sync.service wiring

**Files:**
- Create: `backend/src/repositories/sync-status.repository.js`
- Modify: `backend/src/services/sync.service.js`
- Test: `backend/src/repositories/__tests__/sync-status.repository.test.js`

**Interfaces:**
- Consumes: `prisma.syncStatus` (Task 1)
- Produces: `getSyncStatus()`, `recordSyncSuccess()`, `recordSyncFailure(errorMessage)` from `sync-status.repository.js`

- [ ] **Step 1: Create the repository**

```js
const prisma = require('../lib/prisma');

const SINGLETON_ID = 'singleton';

const getSyncStatus = async () => {
  return await prisma.syncStatus.findUnique({ where: { id: SINGLETON_ID } });
};

const recordSyncSuccess = async () => {
  return await prisma.syncStatus.upsert({
    where: { id: SINGLETON_ID },
    update: { lastSyncAt: new Date(), lastStatus: 'SUCCESS', lastError: null },
    create: { id: SINGLETON_ID, lastSyncAt: new Date(), lastStatus: 'SUCCESS', lastError: null },
  });
};

const recordSyncFailure = async (errorMessage) => {
  return await prisma.syncStatus.upsert({
    where: { id: SINGLETON_ID },
    update: { lastSyncAt: new Date(), lastStatus: 'FAILED', lastError: errorMessage },
    create: { id: SINGLETON_ID, lastSyncAt: new Date(), lastStatus: 'FAILED', lastError: errorMessage },
  });
};

module.exports = { getSyncStatus, recordSyncSuccess, recordSyncFailure };
```

- [ ] **Step 2: Update `sync.service.js`'s `runFullSync` to record status**

Add the import and wrap the try/catch body:

```js
const { recordSyncSuccess, recordSyncFailure } = require('../repositories/sync-status.repository');
```

Replace the body of `runFullSync`:

```js
const runFullSync = async () => {
  try {
    console.log('🔄 Memulai full sync DB → Sheets...');
    const allData = await getAllDataForQuery();
    await syncAllFromDB(allData);
    await recordSyncSuccess();
  } catch (err) {
    console.error('❌ Full sync gagal:', err.message);
    await recordSyncFailure(err.message);
    throw err;
  }
};
```

- [ ] **Step 3: Write repository test**

```js
const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  syncStatus: { findUnique: jest.fn(), upsert: jest.fn() },
}));

const { getSyncStatus, recordSyncSuccess, recordSyncFailure } = require('../sync-status.repository');

describe('sync-status.repository', () => {
  it('reads the singleton sync status', async () => {
    prisma.syncStatus.findUnique.mockResolvedValue({ id: 'singleton', lastStatus: 'SUCCESS' });
    const result = await getSyncStatus();
    expect(prisma.syncStatus.findUnique).toHaveBeenCalledWith({ where: { id: 'singleton' } });
    expect(result.lastStatus).toBe('SUCCESS');
  });

  it('records a successful sync', async () => {
    await recordSyncSuccess();
    const call = prisma.syncStatus.upsert.mock.calls[0][0];
    expect(call.update.lastStatus).toBe('SUCCESS');
    expect(call.update.lastError).toBeNull();
  });

  it('records a failed sync with the error message', async () => {
    await recordSyncFailure('boom');
    const call = prisma.syncStatus.upsert.mock.calls[0][0];
    expect(call.update.lastStatus).toBe('FAILED');
    expect(call.update.lastError).toBe('boom');
  });
});
```

- [ ] **Step 4: Run the test**

Run: `cd backend && npx jest sync-status.repository`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/sync-status.repository.js backend/src/repositories/__tests__/sync-status.repository.test.js backend/src/services/sync.service.js
git commit -m "feat(backend): persist last Sheets sync status"
```

---

### Task 3: Wire up Auth & Admin routes

**Files:**
- Create: `backend/src/routes/auth.route.js`
- Create: `backend/src/routes/admin.route.js`

**Interfaces:**
- Consumes: `auth.controller.js` (`login`, `googleLogin`, `me`, `updateMe`), `admin.controller.js` (`listAdmins`, `createAdmin`, `updateAdmin`, `deleteAdmin`), `auth.middleware.js`, `role.middleware.js` (all pre-existing, unmodified)
- Produces: mountable routers consumed by `routes/api.js` in Task 10

- [ ] **Step 1: Create `auth.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { login, googleLogin, me, updateMe } = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authMiddleware, me);
router.patch('/me', authMiddleware, updateMe);

module.exports = router;
```

- [ ] **Step 2: Create `admin.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { listAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/admin.controller');

router.use(authMiddleware, requireRole('SUPERADMIN'));

router.get('/', listAdmins);
router.post('/', createAdmin);
router.patch('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auth.route.js backend/src/routes/admin.route.js
git commit -m "feat(backend): wire up auth and admin routes"
```

---

### Task 4: Farmer (Peternak) CRUD

**Files:**
- Modify: `backend/src/repositories/farmer.repository.js`
- Create: `backend/src/controllers/farmer.controller.js`
- Create: `backend/src/routes/farmer.route.js`
- Test: `backend/src/controllers/__tests__/farmer.controller.test.js`

**Interfaces:**
- Consumes: `chat-message.repository.js`'s `getRecentMessages(phone, limit)` (pre-existing), `whatsapp.service.js`'s `sendTextMessage(phone, text)` (pre-existing)
- Produces: `farmerRepository.{listFarmers, findFarmerById, createFarmer, updateFarmer, deleteFarmer, listFarmersNotReported}`; router mounted at `/farmers` in Task 10

- [ ] **Step 1: Extend `farmer.repository.js`**

Append before `module.exports` (keep existing functions untouched):

```js
const listFarmers = async ({ search, page, limit }) => {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { whatsappPhone: { contains: search } },
        ],
      }
    : {};

  const [farmers, total] = await Promise.all([
    prisma.farmer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.farmer.count({ where }),
  ]);

  return { farmers, total };
};

const findFarmerById = async (id) => {
  return await prisma.farmer.findUnique({
    where: { id },
    include: { goats: true },
  });
};

const createFarmer = async ({ name, address, whatsappPhone }) => {
  return await prisma.farmer.create({
    data: { name, address: address || '-', whatsappPhone },
  });
};

const updateFarmer = async (id, data) => {
  return await prisma.farmer.update({ where: { id }, data });
};

const deleteFarmer = async (id) => {
  return await prisma.farmer.delete({ where: { id } });
};

const listFarmersNotReported = async (days) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return await prisma.farmer.findMany({
    where: {
      goats: { none: { recordings: { some: { createdAt: { gte: cutoff } } } } },
    },
    include: { goats: true },
    orderBy: { name: 'asc' },
  });
};

module.exports = {
  findOrCreateFarmer,
  getFarmerByPhone,
  searchFarmerByName,
  listFarmers,
  findFarmerById,
  createFarmer,
  updateFarmer,
  deleteFarmer,
  listFarmersNotReported,
};
```

- [ ] **Step 2: Create `farmer.controller.js`**

```js
const farmerRepository = require('../repositories/farmer.repository');
const chatMessageRepository = require('../repositories/chat-message.repository');
const { sendTextMessage } = require('../services/whatsapp.service');

const REMINDER_MESSAGE = 'Halo Pak/Bu, kami belum menerima laporan ternak dari Anda dalam beberapa waktu terakhir. Mohon kirim laporan terbaru kondisi kambing Anda ya. Terima kasih 🙏';

exports.listFarmers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const { farmers, total } = await farmerRepository.listFarmers({ search, page, limit });

    return res.status(200).json({
      success: true,
      data: { farmers, meta: { page, limit, total } },
    });
  } catch (error) {
    console.error('List Farmers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar peternak.',
      error: error.message,
    });
  }
};

exports.getFarmer = async (req, res) => {
  try {
    const farmer = await farmerRepository.findFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { farmer } });
  } catch (error) {
    console.error('Get Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data peternak.',
      error: error.message,
    });
  }
};

exports.createFarmer = async (req, res) => {
  try {
    const { name, address, whatsappPhone } = req.body;

    if (!name || !whatsappPhone) {
      return res.status(400).json({
        success: false,
        message: 'name dan whatsappPhone wajib diisi.',
      });
    }

    const farmer = await farmerRepository.createFarmer({ name, address, whatsappPhone });

    return res.status(201).json({
      success: true,
      message: 'Peternak berhasil ditambahkan.',
      data: { farmer },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor WhatsApp sudah terdaftar.' });
    }
    console.error('Create Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan peternak.',
      error: error.message,
    });
  }
};

exports.updateFarmer = async (req, res) => {
  try {
    const { name, address, whatsappPhone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (whatsappPhone) updateData.whatsappPhone = whatsappPhone;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    const farmer = await farmerRepository.updateFarmer(req.params.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Peternak berhasil diperbarui.',
      data: { farmer },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor WhatsApp sudah terdaftar.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    console.error('Update Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui peternak.',
      error: error.message,
    });
  }
};

exports.deleteFarmer = async (req, res) => {
  try {
    await farmerRepository.deleteFarmer(req.params.id);
    return res.status(200).json({ success: true, message: 'Peternak berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    console.error('Delete Farmer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus peternak.',
      error: error.message,
    });
  }
};

exports.getFarmerChatMessages = async (req, res) => {
  try {
    const farmer = await farmerRepository.findFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }

    const limit = parseInt(req.query.limit, 10) || 100;
    const messages = await chatMessageRepository.getRecentMessages(farmer.whatsappPhone, limit);

    return res.status(200).json({ success: true, data: { messages } });
  } catch (error) {
    console.error('Get Farmer Chat Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat chat.',
      error: error.message,
    });
  }
};

exports.sendReminder = async (req, res) => {
  try {
    const farmer = await farmerRepository.findFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }

    await sendTextMessage(farmer.whatsappPhone, REMINDER_MESSAGE);

    return res.status(200).json({
      success: true,
      message: `Reminder berhasil dikirim ke ${farmer.name}.`,
    });
  } catch (error) {
    console.error('Send Reminder Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim reminder.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 3: Create `farmer.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  listFarmers, getFarmer, createFarmer, updateFarmer, deleteFarmer,
  getFarmerChatMessages, sendReminder,
} = require('../controllers/farmer.controller');

router.use(authMiddleware);

router.get('/', listFarmers);
router.get('/:id', getFarmer);
router.get('/:id/chat-messages', getFarmerChatMessages);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), createFarmer);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateFarmer);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteFarmer);
router.post('/:id/reminder', requireRole('ADMIN', 'SUPERADMIN'), sendReminder);

module.exports = router;
```

- [ ] **Step 4: Write controller test**

```js
const farmerRepository = require('../../repositories/farmer.repository');
const chatMessageRepository = require('../../repositories/chat-message.repository');
const { sendTextMessage } = require('../../services/whatsapp.service');

jest.mock('../../repositories/farmer.repository');
jest.mock('../../repositories/chat-message.repository');
jest.mock('../../services/whatsapp.service');

const { createFarmer, getFarmer, getFarmerChatMessages, sendReminder } = require('../farmer.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('createFarmer', () => {
  it('returns 400 when whatsappPhone is missing', async () => {
    const req = { body: { name: 'Pak Budi' } };
    const res = buildRes();

    await createFarmer(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(farmerRepository.createFarmer).not.toHaveBeenCalled();
  });

  it('returns 409 when the WhatsApp number is already registered', async () => {
    farmerRepository.createFarmer.mockRejectedValue({ code: 'P2002' });
    const req = { body: { name: 'Pak Budi', whatsappPhone: '628123' } };
    const res = buildRes();

    await createFarmer(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('getFarmer', () => {
  it('returns 404 when the farmer does not exist', async () => {
    farmerRepository.findFarmerById.mockResolvedValue(null);
    const req = { params: { id: 'missing' } };
    const res = buildRes();

    await getFarmer(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('getFarmerChatMessages', () => {
  it('looks up messages by the farmer\'s WhatsApp phone', async () => {
    farmerRepository.findFarmerById.mockResolvedValue({ id: 'f1', whatsappPhone: '628123' });
    chatMessageRepository.getRecentMessages.mockResolvedValue([{ id: 'm1' }]);

    const req = { params: { id: 'f1' }, query: {} };
    const res = buildRes();

    await getFarmerChatMessages(req, res);

    expect(chatMessageRepository.getRecentMessages).toHaveBeenCalledWith('628123', 100);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('sendReminder', () => {
  it('sends a WhatsApp reminder to the farmer', async () => {
    farmerRepository.findFarmerById.mockResolvedValue({ id: 'f1', name: 'Pak Budi', whatsappPhone: '628123' });

    const req = { params: { id: 'f1' } };
    const res = buildRes();

    await sendReminder(req, res);

    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.any(String));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && npx jest farmer.controller`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/repositories/farmer.repository.js backend/src/controllers/farmer.controller.js backend/src/routes/farmer.route.js backend/src/controllers/__tests__/farmer.controller.test.js
git commit -m "feat(backend): add farmer CRUD, chat history, and reminder endpoints"
```

---

### Task 5: Goat (Kambing) CRUD + auto ear-tag numbering

**Files:**
- Modify: `backend/src/repositories/goat.repository.js`
- Create: `backend/src/controllers/goat.controller.js`
- Create: `backend/src/routes/goat.route.js`
- Test: `backend/src/controllers/__tests__/goat.controller.test.js`

**Interfaces:**
- Produces: `goatRepository.{listGoats, findGoatById, createGoat, updateGoat, deleteGoat, getNextEarTagNumber, listGoatsWithoutRecentRecording}`; router mounted at `/goats` in Task 10. `listGoatsWithoutRecentRecording(days)` is consumed by Task 8 (dashboard alerts).

- [ ] **Step 1: Extend `goat.repository.js`**

Append before `module.exports`:

```js
const listGoats = async ({ farmerId, page, limit }) => {
  const where = { ...(farmerId && { farmerId }) };

  const [goats, total] = await Promise.all([
    prisma.goat.findMany({
      where,
      include: { farmer: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.goat.count({ where }),
  ]);

  return { goats, total };
};

const findGoatById = async (id) => {
  return await prisma.goat.findUnique({
    where: { id },
    include: { farmer: true, recordings: { orderBy: { createdAt: 'desc' } } },
  });
};

const createGoat = async ({ earTagNumber, farmerId }) => {
  return await prisma.goat.create({
    data: { earTagNumber: earTagNumber.trim(), farmerId },
    include: { farmer: true },
  });
};

const updateGoat = async (id, data) => {
  return await prisma.goat.update({ where: { id }, data });
};

const deleteGoat = async (id) => {
  return await prisma.goat.delete({ where: { id } });
};

const getNextEarTagNumber = async () => {
  const goats = await prisma.goat.findMany({ select: { earTagNumber: true } });
  const maxNumber = goats.reduce((max, goat) => {
    const parsed = parseInt(goat.earTagNumber, 10);
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return String(maxNumber + 1);
};

const listGoatsWithoutRecentRecording = async (days) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return await prisma.goat.findMany({
    where: { recordings: { none: { createdAt: { gte: cutoff } } } },
    include: { farmer: true },
    orderBy: { createdAt: 'asc' },
  });
};

module.exports = {
  findOrCreateGoat,
  getGoatsByFarmerId,
  getGoatByEarTagNumber,
  listGoats,
  findGoatById,
  createGoat,
  updateGoat,
  deleteGoat,
  getNextEarTagNumber,
  listGoatsWithoutRecentRecording,
};
```

- [ ] **Step 2: Create `goat.controller.js`**

```js
const goatRepository = require('../repositories/goat.repository');

exports.listGoats = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const farmerId = req.query.farmerId || undefined;

    const { goats, total } = await goatRepository.listGoats({ farmerId, page, limit });

    return res.status(200).json({
      success: true,
      data: { goats, meta: { page, limit, total } },
    });
  } catch (error) {
    console.error('List Goats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar kambing.',
      error: error.message,
    });
  }
};

exports.getGoat = async (req, res) => {
  try {
    const goat = await goatRepository.findGoatById(req.params.id);
    if (!goat) {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { goat } });
  } catch (error) {
    console.error('Get Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data kambing.',
      error: error.message,
    });
  }
};

exports.getNextEarTagNumber = async (req, res) => {
  try {
    const nextEarTagNumber = await goatRepository.getNextEarTagNumber();
    return res.status(200).json({ success: true, data: { nextEarTagNumber } });
  } catch (error) {
    console.error('Get Next Ear Tag Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghitung nomor telinga berikutnya.',
      error: error.message,
    });
  }
};

exports.createGoat = async (req, res) => {
  try {
    const { earTagNumber, farmerId } = req.body;

    if (!earTagNumber || !farmerId) {
      return res.status(400).json({
        success: false,
        message: 'earTagNumber dan farmerId wajib diisi.',
      });
    }

    const goat = await goatRepository.createGoat({ earTagNumber, farmerId });

    return res.status(201).json({
      success: true,
      message: 'Kambing berhasil ditambahkan.',
      data: { goat },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor telinga sudah digunakan.' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Peternak tidak ditemukan.' });
    }
    console.error('Create Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan kambing.',
      error: error.message,
    });
  }
};

exports.updateGoat = async (req, res) => {
  try {
    const { earTagNumber, farmerId } = req.body;
    const updateData = {};
    if (earTagNumber) updateData.earTagNumber = earTagNumber;
    if (farmerId) updateData.farmerId = farmerId;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    const goat = await goatRepository.updateGoat(req.params.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Kambing berhasil diperbarui.',
      data: { goat },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor telinga sudah digunakan.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    console.error('Update Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui kambing.',
      error: error.message,
    });
  }
};

exports.deleteGoat = async (req, res) => {
  try {
    await goatRepository.deleteGoat(req.params.id);
    return res.status(200).json({ success: true, message: 'Kambing berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Kambing tidak ditemukan.' });
    }
    console.error('Delete Goat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus kambing.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 3: Create `goat.route.js`**

Route order matters: `/next-ear-tag` must be declared before `/:id`.

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  listGoats, getGoat, createGoat, updateGoat, deleteGoat, getNextEarTagNumber,
} = require('../controllers/goat.controller');

router.use(authMiddleware);

router.get('/', listGoats);
router.get('/next-ear-tag', getNextEarTagNumber);
router.get('/:id', getGoat);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), createGoat);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateGoat);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteGoat);

module.exports = router;
```

- [ ] **Step 4: Write controller test**

```js
const goatRepository = require('../../repositories/goat.repository');

jest.mock('../../repositories/goat.repository');

const { createGoat, getNextEarTagNumber, getGoat } = require('../goat.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('createGoat', () => {
  it('returns 400 when earTagNumber or farmerId is missing', async () => {
    const req = { body: { earTagNumber: '12' } };
    const res = buildRes();

    await createGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.createGoat).not.toHaveBeenCalled();
  });

  it('returns 409 when the ear tag number is already used', async () => {
    goatRepository.createGoat.mockRejectedValue({ code: 'P2002' });
    const req = { body: { earTagNumber: '12', farmerId: 'f1' } };
    const res = buildRes();

    await createGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 400 when the farmer does not exist', async () => {
    goatRepository.createGoat.mockRejectedValue({ code: 'P2003' });
    const req = { body: { earTagNumber: '12', farmerId: 'missing' } };
    const res = buildRes();

    await createGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getNextEarTagNumber', () => {
  it('returns the next suggested ear tag number', async () => {
    goatRepository.getNextEarTagNumber.mockResolvedValue('13');
    const req = {};
    const res = buildRes();

    await getNextEarTagNumber(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.nextEarTagNumber).toBe('13');
  });
});

describe('getGoat', () => {
  it('returns 404 when the goat does not exist', async () => {
    goatRepository.findGoatById.mockResolvedValue(null);
    const req = { params: { id: 'missing' } };
    const res = buildRes();

    await getGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && npx jest goat.controller`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/repositories/goat.repository.js backend/src/controllers/goat.controller.js backend/src/routes/goat.route.js backend/src/controllers/__tests__/goat.controller.test.js
git commit -m "feat(backend): add goat CRUD and next ear tag number endpoint"
```

---

### Task 6: Recording CRUD (manual = final, WA = perlu direview)

**Files:**
- Modify: `backend/src/repositories/recording.repository.js`
- Create: `backend/src/controllers/recording.controller.js`
- Create: `backend/src/routes/recording.route.js`
- Test: `backend/src/controllers/__tests__/recording.controller.test.js`

**Interfaces:**
- Consumes: `req.user.name` (set by `auth.middleware.js` from the JWT payload) as the `senderName` for manually-created recordings.
- Produces: `recordingRepository.{createManualRecording, listRecordings, findRecordingById, updateRecording, deleteRecording}`; router mounted at `/recordings` in Task 10. Does **not** touch the existing `createRecording` used by `recording.service.js`'s WhatsApp pipeline — Prisma's schema defaults (`status: PERLU_REVIEW`, `source: WA`) apply automatically there.

- [ ] **Step 1: Extend `recording.repository.js`**

Append before `module.exports` (keep `createRecording`, `getRecordingsByGoatId`, `getFullDataByFarmerId`, `getAllDataForQuery` unmodified):

```js
const createManualRecording = async ({
  goatId, senderName, matingDate, birthDate, maleKidCount, femaleKidCount,
  matingNumber, saleTarget, sold, notes, photoUrl,
}) => {
  return await prisma.recording.create({
    data: {
      goatId,
      senderName,
      matingDate: matingDate || '-',
      birthDate: birthDate || '-',
      maleKidCount: maleKidCount !== undefined ? String(maleKidCount) : '-',
      femaleKidCount: femaleKidCount !== undefined ? String(femaleKidCount) : '-',
      matingNumber: matingNumber !== undefined ? String(matingNumber) : '-',
      saleTarget: saleTarget || '-',
      sold: sold || '-',
      notes: notes || '-',
      photoUrl: photoUrl || null,
      status: 'FINAL',
      source: 'MANUAL',
    },
  });
};

const listRecordings = async ({ status, goatId, farmerId, page, limit }) => {
  const where = {
    ...(status && { status }),
    ...(goatId && { goatId }),
    ...(farmerId && { goat: { farmerId } }),
  };

  const [recordings, total] = await Promise.all([
    prisma.recording.findMany({
      where,
      include: { goat: { include: { farmer: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.recording.count({ where }),
  ]);

  return { recordings, total };
};

const findRecordingById = async (id) => {
  return await prisma.recording.findUnique({
    where: { id },
    include: { goat: { include: { farmer: true } } },
  });
};

const updateRecording = async (id, data) => {
  return await prisma.recording.update({ where: { id }, data });
};

const deleteRecording = async (id) => {
  return await prisma.recording.delete({ where: { id } });
};

module.exports = {
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

- [ ] **Step 2: Create `recording.controller.js`**

```js
const recordingRepository = require('../repositories/recording.repository');

const RECORDING_STATUSES = ['PERLU_REVIEW', 'FINAL'];

exports.listRecordings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status, goatId, farmerId } = req.query;

    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.`,
      });
    }

    const { recordings, total } = await recordingRepository.listRecordings({ status, goatId, farmerId, page, limit });

    return res.status(200).json({
      success: true,
      data: { recordings, meta: { page, limit, total } },
    });
  } catch (error) {
    console.error('List Recordings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar recording.',
      error: error.message,
    });
  }
};

exports.getRecording = async (req, res) => {
  try {
    const recording = await recordingRepository.findRecordingById(req.params.id);
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: { recording } });
  } catch (error) {
    console.error('Get Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data recording.',
      error: error.message,
    });
  }
};

exports.createRecording = async (req, res) => {
  try {
    const {
      goatId, matingDate, birthDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, notes, photoUrl,
    } = req.body;

    if (!goatId) {
      return res.status(400).json({ success: false, message: 'goatId wajib diisi.' });
    }

    const recording = await recordingRepository.createManualRecording({
      goatId,
      senderName: req.user.name,
      matingDate, birthDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, notes, photoUrl,
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
    console.error('Create Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan recording.',
      error: error.message,
    });
  }
};

exports.updateRecording = async (req, res) => {
  try {
    const {
      matingDate, birthDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, notes, photoUrl, status,
    } = req.body;

    if (status && !RECORDING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status harus salah satu dari: ${RECORDING_STATUSES.join(', ')}.`,
      });
    }

    const updateData = {};
    if (matingDate !== undefined) updateData.matingDate = matingDate;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (maleKidCount !== undefined) updateData.maleKidCount = maleKidCount;
    if (femaleKidCount !== undefined) updateData.femaleKidCount = femaleKidCount;
    if (matingNumber !== undefined) updateData.matingNumber = matingNumber;
    if (saleTarget !== undefined) updateData.saleTarget = saleTarget;
    if (sold !== undefined) updateData.sold = sold;
    if (notes !== undefined) updateData.notes = notes;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
    }

    const recording = await recordingRepository.updateRecording(req.params.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Recording berhasil diperbarui.',
      data: { recording },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    console.error('Update Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui recording.',
      error: error.message,
    });
  }
};

exports.deleteRecording = async (req, res) => {
  try {
    await recordingRepository.deleteRecording(req.params.id);
    return res.status(200).json({ success: true, message: 'Recording berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Recording tidak ditemukan.' });
    }
    console.error('Delete Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus recording.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 3: Create `recording.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  listRecordings, getRecording, createRecording, updateRecording, deleteRecording,
} = require('../controllers/recording.controller');

router.use(authMiddleware);

router.get('/', listRecordings);
router.get('/:id', getRecording);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), createRecording);
router.patch('/:id', requireRole('ADMIN', 'SUPERADMIN'), updateRecording);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), deleteRecording);

module.exports = router;
```

- [ ] **Step 4: Write controller test**

```js
const recordingRepository = require('../../repositories/recording.repository');

jest.mock('../../repositories/recording.repository');

const { createRecording, updateRecording, listRecordings } = require('../recording.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('createRecording', () => {
  it('returns 400 when goatId is missing', async () => {
    const req = { body: {}, user: { name: 'Admin Satu' } };
    const res = buildRes();

    await createRecording(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.createManualRecording).not.toHaveBeenCalled();
  });

  it('creates a manual recording as FINAL/MANUAL using the logged-in admin name', async () => {
    recordingRepository.createManualRecording.mockResolvedValue({ id: 'r1', status: 'FINAL', source: 'MANUAL' });

    const req = { body: { goatId: 'g1', notes: 'Sehat' }, user: { name: 'Admin Satu' } };
    const res = buildRes();

    await createRecording(req, res);

    expect(recordingRepository.createManualRecording).toHaveBeenCalledWith(
      expect.objectContaining({ goatId: 'g1', senderName: 'Admin Satu' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateRecording', () => {
  it('rejects an invalid status value', async () => {
    const req = { params: { id: 'r1' }, body: { status: 'INVALID' } };
    const res = buildRes();

    await updateRecording(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.updateRecording).not.toHaveBeenCalled();
  });

  it('allows moving a recording from PERLU_REVIEW to FINAL', async () => {
    recordingRepository.updateRecording.mockResolvedValue({ id: 'r1', status: 'FINAL' });
    const req = { params: { id: 'r1' }, body: { status: 'FINAL' } };
    const res = buildRes();

    await updateRecording(req, res);

    expect(recordingRepository.updateRecording).toHaveBeenCalledWith('r1', { status: 'FINAL' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('listRecordings', () => {
  it('rejects an invalid status filter', async () => {
    const req = { query: { status: 'INVALID' } };
    const res = buildRes();

    await listRecordings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.listRecordings).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && npx jest recording.controller`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/repositories/recording.repository.js backend/src/controllers/recording.controller.js backend/src/routes/recording.route.js backend/src/controllers/__tests__/recording.controller.test.js
git commit -m "feat(backend): add recording CRUD with review/final status workflow"
```

---

### Task 7: Follow-up (peternak belum lapor + reminder massal)

**Files:**
- Create: `backend/src/controllers/follow-up.controller.js`
- Create: `backend/src/routes/follow-up.route.js`
- Test: `backend/src/controllers/__tests__/follow-up.controller.test.js`

**Interfaces:**
- Consumes: `farmerRepository.listFarmersNotReported(days)` (Task 4), `sendTextMessage(phone, text)` (pre-existing)
- Produces: router mounted at `/follow-ups` in Task 10

- [ ] **Step 1: Create `follow-up.controller.js`**

```js
const farmerRepository = require('../repositories/farmer.repository');
const { sendTextMessage } = require('../services/whatsapp.service');

const REMINDER_MESSAGE = 'Halo Pak/Bu, kami belum menerima laporan ternak dari Anda dalam beberapa waktu terakhir. Mohon kirim laporan terbaru kondisi kambing Anda ya. Terima kasih 🙏';

exports.listNotReported = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const farmers = await farmerRepository.listFarmersNotReported(days);

    return res.status(200).json({
      success: true,
      data: { farmers, days },
    });
  } catch (error) {
    console.error('List Follow-up Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar peternak belum lapor.',
      error: error.message,
    });
  }
};

exports.sendBulkReminder = async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || 30;
    const farmers = await farmerRepository.listFarmersNotReported(days);

    const results = await Promise.allSettled(
      farmers.map((farmer) => sendTextMessage(farmer.whatsappPhone, REMINDER_MESSAGE))
    );

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - sentCount;

    return res.status(200).json({
      success: true,
      message: `Reminder terkirim ke ${sentCount} peternak${failedCount > 0 ? `, ${failedCount} gagal` : ''}.`,
      data: { sentCount, failedCount },
    });
  } catch (error) {
    console.error('Bulk Reminder Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim reminder massal.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 2: Create `follow-up.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { listNotReported, sendBulkReminder } = require('../controllers/follow-up.controller');

router.use(authMiddleware);

router.get('/', listNotReported);
router.post('/reminders', requireRole('ADMIN', 'SUPERADMIN'), sendBulkReminder);

module.exports = router;
```

- [ ] **Step 3: Write controller test**

```js
const farmerRepository = require('../../repositories/farmer.repository');
const { sendTextMessage } = require('../../services/whatsapp.service');

jest.mock('../../repositories/farmer.repository');
jest.mock('../../services/whatsapp.service');

const { listNotReported, sendBulkReminder } = require('../follow-up.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('listNotReported', () => {
  it('defaults to 30 days when no query param is given', async () => {
    farmerRepository.listFarmersNotReported.mockResolvedValue([]);
    const req = { query: {} };
    const res = buildRes();

    await listNotReported(req, res);

    expect(farmerRepository.listFarmersNotReported).toHaveBeenCalledWith(30);
  });
});

describe('sendBulkReminder', () => {
  it('sends a reminder to every farmer returned and reports counts', async () => {
    farmerRepository.listFarmersNotReported.mockResolvedValue([
      { id: 'f1', whatsappPhone: '6281' },
      { id: 'f2', whatsappPhone: '6282' },
    ]);
    sendTextMessage.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('down'));

    const req = { body: {} };
    const res = buildRes();

    await sendBulkReminder(req, res);

    expect(sendTextMessage).toHaveBeenCalledTimes(2);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.sentCount).toBe(1);
    expect(jsonArg.data.failedCount).toBe(1);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `cd backend && npx jest follow-up.controller`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/follow-up.controller.js backend/src/routes/follow-up.route.js backend/src/controllers/__tests__/follow-up.controller.test.js
git commit -m "feat(backend): add follow-up list and bulk WhatsApp reminder endpoint"
```

---

### Task 8: Dashboard (Ringkasan) — stats, charts, alerts

**Files:**
- Create: `backend/src/services/dashboard.service.js`
- Create: `backend/src/controllers/dashboard.controller.js`
- Create: `backend/src/routes/dashboard.route.js`
- Test: `backend/src/services/__tests__/dashboard.service.test.js`

**Interfaces:**
- Consumes: `getSyncStatus()` (Task 2), `listFarmersNotReported(days)` (Task 4), `listGoatsWithoutRecentRecording(days)` (Task 5)
- Produces: `dashboardService.{getSummary, getCharts, getAlerts}`; router mounted at `/dashboard` in Task 10

- [ ] **Step 1: Create `dashboard.service.js`**

```js
const prisma = require('../lib/prisma');
const { getSyncStatus } = require('../repositories/sync-status.repository');
const { listFarmersNotReported } = require('../repositories/farmer.repository');
const { listGoatsWithoutRecentRecording } = require('../repositories/goat.repository');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const toNumberSafe = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSummary = async () => {
  const [
    totalFarmers, totalGoats, recordingsLast7Days, recordingsLast30Days,
    pendingReviewCount, farmersNotReported, syncStatus,
  ] = await Promise.all([
    prisma.farmer.count(),
    prisma.goat.count(),
    prisma.recording.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.recording.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.recording.count({ where: { status: 'PERLU_REVIEW' } }),
    listFarmersNotReported(30),
    getSyncStatus(),
  ]);

  return {
    totalFarmers,
    totalGoats,
    recordingsLast7Days,
    recordingsLast30Days,
    pendingReviewCount,
    farmersNotReportedCount: farmersNotReported.length,
    lastSync: syncStatus || { lastSyncAt: null, lastStatus: 'BELUM_PERNAH', lastError: null },
  };
};

const getCharts = async () => {
  const recordings = await prisma.recording.findMany({
    where: { createdAt: { gte: daysAgo(30) } },
    select: { createdAt: true, maleKidCount: true, femaleKidCount: true, sold: true, saleTarget: true },
  });

  const trendByDay = {};
  let totalMaleKids = 0;
  let totalFemaleKids = 0;
  let soldCount = 0;
  let targetOnlyCount = 0;

  for (const recording of recordings) {
    const day = recording.createdAt.toISOString().slice(0, 10);
    trendByDay[day] = (trendByDay[day] || 0) + 1;

    totalMaleKids += toNumberSafe(recording.maleKidCount);
    totalFemaleKids += toNumberSafe(recording.femaleKidCount);

    const isSold = /ya/i.test(recording.sold || '');
    const hasTarget = recording.saleTarget && recording.saleTarget !== '-';

    if (isSold) soldCount += 1;
    else if (hasTarget) targetOnlyCount += 1;
  }

  const recordingTrend = Object.entries(trendByDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  return {
    recordingTrend,
    kidsBornByGender: { male: totalMaleKids, female: totalFemaleKids },
    soldVsTarget: { sold: soldCount, targetOnly: targetOnlyCount },
  };
};

const getAlerts = async () => {
  const goats = await listGoatsWithoutRecentRecording(30);
  return goats.map((goat) => ({
    goatId: goat.id,
    earTagNumber: goat.earTagNumber,
    farmerId: goat.farmerId,
    farmerName: goat.farmer.name,
  }));
};

module.exports = { getSummary, getCharts, getAlerts };
```

- [ ] **Step 2: Create `dashboard.controller.js`**

```js
const dashboardService = require('../services/dashboard.service');

exports.getSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getSummary();
    return res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil ringkasan dashboard.',
      error: error.message,
    });
  }
};

exports.getCharts = async (req, res) => {
  try {
    const charts = await dashboardService.getCharts();
    return res.status(200).json({ success: true, data: { charts } });
  } catch (error) {
    console.error('Dashboard Charts Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data visualisasi.',
      error: error.message,
    });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await dashboardService.getAlerts();
    return res.status(200).json({ success: true, data: { alerts } });
  } catch (error) {
    console.error('Dashboard Alerts Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil alert kambing.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 3: Create `dashboard.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { getSummary, getCharts, getAlerts } = require('../controllers/dashboard.controller');

router.use(authMiddleware);

router.get('/summary', getSummary);
router.get('/charts', getCharts);
router.get('/alerts', getAlerts);

module.exports = router;
```

- [ ] **Step 4: Write service test**

```js
const prisma = require('../../lib/prisma');
const { getSyncStatus } = require('../../repositories/sync-status.repository');
const { listFarmersNotReported } = require('../../repositories/farmer.repository');
const { listGoatsWithoutRecentRecording } = require('../../repositories/goat.repository');

jest.mock('../../lib/prisma', () => ({
  farmer: { count: jest.fn() },
  goat: { count: jest.fn() },
  recording: { count: jest.fn(), findMany: jest.fn() },
}));
jest.mock('../../repositories/sync-status.repository');
jest.mock('../../repositories/farmer.repository');
jest.mock('../../repositories/goat.repository');

const { getSummary, getCharts, getAlerts } = require('../dashboard.service');

describe('getSummary', () => {
  it('aggregates counts and last sync status', async () => {
    prisma.farmer.count.mockResolvedValue(10);
    prisma.goat.count.mockResolvedValue(25);
    prisma.recording.count.mockResolvedValueOnce(4).mockResolvedValueOnce(12).mockResolvedValueOnce(3);
    listFarmersNotReported.mockResolvedValue([{ id: 'f1' }]);
    getSyncStatus.mockResolvedValue({ lastStatus: 'SUCCESS' });

    const summary = await getSummary();

    expect(summary.totalFarmers).toBe(10);
    expect(summary.totalGoats).toBe(25);
    expect(summary.pendingReviewCount).toBe(3);
    expect(summary.farmersNotReportedCount).toBe(1);
    expect(summary.lastSync.lastStatus).toBe('SUCCESS');
  });
});

describe('getCharts', () => {
  it('aggregates recording trend and kid counts by gender', async () => {
    prisma.recording.findMany.mockResolvedValue([
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '2', femaleKidCount: '1', sold: 'Ya', saleTarget: '-' },
      { createdAt: new Date('2026-07-01T00:00:00Z'), maleKidCount: '-', femaleKidCount: '3', sold: 'Belum', saleTarget: '10 Juli' },
    ]);

    const charts = await getCharts();

    expect(charts.recordingTrend).toEqual([{ date: '2026-07-01', count: 2 }]);
    expect(charts.kidsBornByGender).toEqual({ male: 2, female: 4 });
    expect(charts.soldVsTarget).toEqual({ sold: 1, targetOnly: 1 });
  });
});

describe('getAlerts', () => {
  it('maps goats without recent recordings to alert entries', async () => {
    listGoatsWithoutRecentRecording.mockResolvedValue([
      { id: 'g1', earTagNumber: '12', farmerId: 'f1', farmer: { name: 'Pak Budi' } },
    ]);

    const alerts = await getAlerts();

    expect(alerts).toEqual([{ goatId: 'g1', earTagNumber: '12', farmerId: 'f1', farmerName: 'Pak Budi' }]);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && npx jest dashboard.service`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/dashboard.service.js backend/src/controllers/dashboard.controller.js backend/src/routes/dashboard.route.js backend/src/services/__tests__/dashboard.service.test.js
git commit -m "feat(backend): add dashboard summary, charts, and alert endpoints"
```

---

### Task 9: Sync status endpoint + protected manual retry

**Files:**
- Create: `backend/src/controllers/sync.controller.js`
- Create: `backend/src/routes/sync.route.js`
- Test: `backend/src/controllers/__tests__/sync.controller.test.js`

**Interfaces:**
- Consumes: `getSyncStatus()` (Task 2), `runFullSync()` (`sync.service.js`, modified in Task 2)
- Produces: router mounted at `/sync` in Task 10, replacing the old unauthenticated `POST /admin/sync` in `server.js`

- [ ] **Step 1: Create `sync.controller.js`**

```js
const { runFullSync } = require('../services/sync.service');
const { getSyncStatus } = require('../repositories/sync-status.repository');

exports.getStatus = async (req, res) => {
  try {
    const status = await getSyncStatus();
    return res.status(200).json({
      success: true,
      data: { sync: status || { lastSyncAt: null, lastStatus: 'BELUM_PERNAH', lastError: null } },
    });
  } catch (error) {
    console.error('Get Sync Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil status sinkronisasi.',
      error: error.message,
    });
  }
};

exports.retrySync = async (req, res) => {
  try {
    await runFullSync();
    return res.status(200).json({ success: true, message: 'Sinkronisasi ulang berhasil.' });
  } catch (error) {
    console.error('Retry Sync Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Sinkronisasi ulang gagal.',
      error: error.message,
    });
  }
};
```

- [ ] **Step 2: Create `sync.route.js`**

```js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { getStatus, retrySync } = require('../controllers/sync.controller');

router.get('/status', authMiddleware, getStatus);
router.post('/retry', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), retrySync);

module.exports = router;
```

- [ ] **Step 3: Write controller test**

```js
const { runFullSync } = require('../../services/sync.service');
const { getSyncStatus } = require('../../repositories/sync-status.repository');

jest.mock('../../services/sync.service');
jest.mock('../../repositories/sync-status.repository');

const { getStatus, retrySync } = require('../sync.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('getStatus', () => {
  it('returns a BELUM_PERNAH placeholder when no sync has run yet', async () => {
    getSyncStatus.mockResolvedValue(null);
    const req = {};
    const res = buildRes();

    await getStatus(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.sync.lastStatus).toBe('BELUM_PERNAH');
  });
});

describe('retrySync', () => {
  it('returns 500 with the failure message when the sync fails', async () => {
    runFullSync.mockRejectedValue(new Error('Sheets API down'));
    const req = {};
    const res = buildRes();

    await retrySync(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 200 when the sync succeeds', async () => {
    runFullSync.mockResolvedValue();
    const req = {};
    const res = buildRes();

    await retrySync(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `cd backend && npx jest sync.controller`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/sync.controller.js backend/src/routes/sync.route.js backend/src/controllers/__tests__/sync.controller.test.js
git commit -m "feat(backend): add sync status and protected manual retry endpoints"
```

---

### Task 10: `routes/api.js` aggregator + `server.js` wiring

**Files:**
- Create: `backend/src/routes/api.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- Consumes: every router created in Tasks 3–9 plus the pre-existing `webhook.route.js`.
- Produces: `GET /api` self-documenting index; all resources mounted under `/api/*`; removes the old unauthenticated `POST /admin/sync`.

- [ ] **Step 1: Create `routes/api.js`**

```js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.route');
const adminRoutes = require('./admin.route');
const farmerRoutes = require('./farmer.route');
const goatRoutes = require('./goat.route');
const recordingRoutes = require('./recording.route');
const followUpRoutes = require('./follow-up.route');
const dashboardRoutes = require('./dashboard.route');
const syncRoutes = require('./sync.route');
const webhookRoutes = require('./webhook.route');

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    endpoints: {
      auth: '/api/auth',
      admins: '/api/admins',
      farmers: '/api/farmers',
      goats: '/api/goats',
      recordings: '/api/recordings',
      followUps: '/api/follow-ups',
      dashboard: '/api/dashboard',
      sync: '/api/sync',
      webhook: '/api/webhook',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/farmers', farmerRoutes);
router.use('/goats', goatRoutes);
router.use('/recordings', recordingRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/sync', syncRoutes);
router.use('/webhook', webhookRoutes);

module.exports = router;
```

- [ ] **Step 2: Replace `server.js`**

```js
require('dotenv').config();
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is active' });
});

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Recording Ternak Backend is healthy' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Recording Ternak Backend running on port ${PORT}`);
    console.log(`👉 Webhook URL: http://localhost:${PORT}/api/webhook`);
  });
}

module.exports = app;
```

- [ ] **Step 3: Run the full existing test suite to confirm nothing broke**

Run: `cd backend && npx jest`
Expected: all existing suites (webhook, admin, auth, middleware, plus every suite from Tasks 2–9) PASS. `admin.controller.test.js` and `auth.service.test.js` are unaffected since they test controllers/services directly, not routes.

- [ ] **Step 4: Manual smoke check**

Run: `cd backend && npm run dev`, then in another terminal:
```bash
curl http://localhost:5000/api
curl http://localhost:5000/api/webhook
```
Expected: first returns the endpoint index JSON; second behaves exactly as before (webhook verification logic unchanged).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/api.js backend/src/server.js
git commit -m "feat(backend): mount all resource routes under /api via aggregator router"
```

---

## Post-plan notes (not implemented in this pass — flag to Zaidan)

- **Cloudinary photo upload**: `Recording.photoUrl` is a plain string field. Actual image upload is assumed to happen client-side (unsigned Cloudinary upload) per the answer given during planning. If a server-side signed upload is later wanted, that's a separate `external-api-integration` pass.
- **SUPERADMIN bootstrap**: per the spec, the first `SUPERADMIN` account is still created manually in Supabase — no endpoint for that by design.
- **Pagination defaults** (`page=1`, `limit=20`) are applied uniformly across `farmers`, `goats`, `recordings` — adjust per-resource if the frontend needs different page sizes.

# Cloudinary Recording Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store recording photos in Cloudinary — via a dashboard admin upload endpoint and via WhatsApp image messages — and persist the resulting URL/public_id on the `Recording` row, with best-effort cleanup of old assets on replace/delete.

**Architecture:** A thin `cloudinary.service.js` wraps the Cloudinary SDK (`uploadImage`, `deleteImage`). The dashboard gets a new `POST /api/uploads/photo` endpoint (multer memory storage → Cloudinary → returns `{url, publicId}`) that the frontend calls before submitting the recording form. WhatsApp image messages are downloaded from Meta's Media API, validated, uploaded to Cloudinary, and threaded through the existing session-based conversation state (`session.data.photo`) until the report is actually saved. A new `photoPublicId` column lets us reliably delete the old Cloudinary asset when a photo is replaced or a recording is deleted.

**Tech Stack:** Node.js, Express, Prisma/PostgreSQL, Jest, `cloudinary` SDK, `multer`.

## Global Constraints

- Allowed photo MIME types: `image/jpeg`, `image/png` only — applies to both the dashboard upload endpoint and WhatsApp image handling.
- Max photo size: 5MB — applies to both upload sources; reject before calling Cloudinary.
- Cloudinary delete/cleanup calls are always best-effort: log errors via `console.error`, never fail the primary HTTP response or WhatsApp reply because a cleanup call failed.
- New env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Dashboard upload endpoint auth: `authMiddleware` + `requireRole('ADMIN', 'SUPERADMIN')` (same as recording create/update).
- No orphaned uploads: for WhatsApp, only download/upload a photo once we know it can be attached to something (active session state, or a caption that forms a report).

---

### Task 1: Add `photoPublicId` column and Cloudinary config/dependencies

**Files:**
- Modify: `backend/prisma/schema.prisma` (Recording model, after `photoUrl` at line 60)
- Modify: `backend/src/config/index.js`
- Modify: `backend/package.json` (add `cloudinary`, `multer` dependencies)
- Modify: `backend/.env.example`

**Interfaces:**
- Produces: `config.cloudinary.cloudName`, `config.cloudinary.apiKey`, `config.cloudinary.apiSecret` (read by Task 2's `cloudinary.service.js`).
- Produces: `Recording.photoPublicId` (String, nullable) on the Prisma model — consumed by Tasks 3, 4, 5, 6.

- [ ] **Step 1: Add the schema field**

In `backend/prisma/schema.prisma`, change:

```prisma
  photoUrl       String?         @map("photo_url")
  createdAt      DateTime        @default(now())
```

to:

```prisma
  photoUrl       String?         @map("photo_url")
  photoPublicId  String?         @map("photo_public_id")
  createdAt      DateTime        @default(now())
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && npx prisma migrate dev --name add_recording_photo_public_id`
Expected: Migration created and applied, output ends with `Your database is now in sync with your schema.`

- [ ] **Step 3: Install new dependencies**

Run: `cd backend && npm install cloudinary multer`
Expected: `package.json` now lists `cloudinary` and `multer` under `dependencies`.

- [ ] **Step 4: Add Cloudinary config block**

In `backend/src/config/index.js`, add a new top-level key after the `whatsapp` block (after line 24, before `auth:`):

```javascript
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey:    process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

```

- [ ] **Step 5: Document the new env vars**

Append to `backend/.env.example`:

```
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

- [ ] **Step 6: Verify Prisma client reflects the new field**

Run: `cd backend && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); console.log(Object.keys(p.recording.fields))"`
Expected: output array includes `photoPublicId`

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/config/index.js backend/package.json backend/package-lock.json backend/.env.example
git commit -m "feat(backend): add photoPublicId column and Cloudinary config"
```

---

### Task 2: `cloudinary.service.js`

**Files:**
- Create: `backend/src/services/cloudinary.service.js`
- Test: `backend/src/services/__tests__/cloudinary.service.test.js`

**Interfaces:**
- Consumes: `config.cloudinary.{cloudName,apiKey,apiSecret}` (from Task 1).
- Produces:
  - `uploadImage(buffer: Buffer, folder: string): Promise<{ url: string, publicId: string }>`
  - `deleteImage(publicId: string): Promise<void>` — never throws.

  These two functions are consumed by Task 3 (`uploads.controller.js`), Task 4 (`recording.controller.js`), and Task 6 (`recording.service.js`).

- [ ] **Step 1: Write the failing tests**

Create `backend/src/services/__tests__/cloudinary.service.test.js`:

```javascript
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

const cloudinary = require('cloudinary').v2;
const { uploadImage, deleteImage } = require('../cloudinary.service');

describe('uploadImage', () => {
  it('resolves with url and publicId on success', async () => {
    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      callback(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/recording-ternak/dashboard/abc.jpg', public_id: 'recording-ternak/dashboard/abc' });
      return { end: jest.fn() };
    });

    const result = await uploadImage(Buffer.from('fake-image-bytes'), 'recording-ternak/dashboard');

    expect(result).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/recording-ternak/dashboard/abc.jpg',
      publicId: 'recording-ternak/dashboard/abc',
    });
  });

  it('rejects when the Cloudinary upload callback returns an error', async () => {
    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      callback(new Error('cloudinary down'), null);
      return { end: jest.fn() };
    });

    await expect(uploadImage(Buffer.from('x'), 'recording-ternak/dashboard')).rejects.toThrow('cloudinary down');
  });
});

describe('deleteImage', () => {
  it('calls cloudinary destroy with the given publicId', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    await deleteImage('recording-ternak/dashboard/abc');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('recording-ternak/dashboard/abc');
  });

  it('swallows errors instead of throwing', async () => {
    cloudinary.uploader.destroy.mockRejectedValue(new Error('not found'));

    await expect(deleteImage('missing-id')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/__tests__/cloudinary.service.test.js`
Expected: FAIL with `Cannot find module '../cloudinary.service'`

- [ ] **Step 3: Implement `cloudinary.service.js`**

Create `backend/src/services/cloudinary.service.js`:

```javascript
const cloudinary = require('cloudinary').v2;
const config = require('../config');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const uploadImage = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('❌ Gagal menghapus foto di Cloudinary:', error.message);
  }
};

module.exports = { uploadImage, deleteImage };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/__tests__/cloudinary.service.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/cloudinary.service.js backend/src/services/__tests__/cloudinary.service.test.js
git commit -m "feat(backend): add cloudinary.service for photo upload/delete"
```

---

### Task 3: Dashboard upload endpoint (`POST /api/uploads/photo`)

**Files:**
- Create: `backend/src/middlewares/upload.middleware.js`
- Create: `backend/src/controllers/uploads.controller.js`
- Create: `backend/src/routes/uploads.route.js`
- Modify: `backend/src/routes/api.js`
- Test: `backend/src/controllers/__tests__/uploads.controller.test.js`

**Interfaces:**
- Consumes: `cloudinary.service.uploadImage(buffer, folder)` (Task 2).
- Produces: `uploadPhoto(req, res)` handler exported from `uploads.controller.js`, mounted at `POST /api/uploads/photo`. Response shape on success: `{ success: true, data: { url, publicId } }`.

- [ ] **Step 1: Write the failing controller tests**

Create `backend/src/controllers/__tests__/uploads.controller.test.js`:

```javascript
const cloudinaryService = require('../../services/cloudinary.service');

jest.mock('../../services/cloudinary.service');

const { uploadPhoto } = require('../uploads.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('uploadPhoto', () => {
  it('returns 400 when no file is attached', async () => {
    const req = { file: undefined };
    const res = buildRes();

    await uploadPhoto(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
  });

  it('uploads the file buffer to the dashboard folder and returns url/publicId', async () => {
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/x.jpg', publicId: 'recording-ternak/dashboard/x' });
    const req = { file: { buffer: Buffer.from('bytes'), mimetype: 'image/jpeg' } };
    const res = buildRes();

    await uploadPhoto(req, res);

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(req.file.buffer, 'recording-ternak/dashboard');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { url: 'https://res.cloudinary.com/demo/x.jpg', publicId: 'recording-ternak/dashboard/x' },
    });
  });

  it('returns 500 when the cloudinary upload throws', async () => {
    cloudinaryService.uploadImage.mockRejectedValue(new Error('cloudinary down'));
    const req = { file: { buffer: Buffer.from('bytes'), mimetype: 'image/jpeg' } };
    const res = buildRes();

    await uploadPhoto(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/controllers/__tests__/uploads.controller.test.js`
Expected: FAIL with `Cannot find module '../uploads.controller'`

- [ ] **Step 3: Implement the upload middleware**

Create `backend/src/middlewares/upload.middleware.js`:

```javascript
const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Tipe file harus JPEG atau PNG.'));
    }
    cb(null, true);
  },
});

module.exports = { upload, ALLOWED_MIME_TYPES, MAX_SIZE_BYTES };
```

- [ ] **Step 4: Implement `uploads.controller.js`**

Create `backend/src/controllers/uploads.controller.js`:

```javascript
const cloudinaryService = require('../services/cloudinary.service');

const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File foto wajib diunggah.' });
    }

    const { url, publicId } = await cloudinaryService.uploadImage(req.file.buffer, 'recording-ternak/dashboard');

    return res.status(201).json({
      success: true,
      data: { url, publicId },
    });
  } catch (error) {
    console.error('Upload Photo Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengunggah foto.',
      error: error.message,
    });
  }
};

module.exports = { uploadPhoto };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/controllers/__tests__/uploads.controller.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Wire up the route**

Create `backend/src/routes/uploads.route.js`:

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { uploadPhoto } = require('../controllers/uploads.controller');

router.use(authMiddleware);

// multer errors (bad mime type, file too large) are handled here via callback
// form instead of Express error middleware — this is multer's documented
// pattern and works regardless of where a global error handler might sit.
const runUpload = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post('/photo', requireRole('ADMIN', 'SUPERADMIN'), runUpload, uploadPhoto);

module.exports = router;
```

- [ ] **Step 7: Mount the route in the API aggregator**

In `backend/src/routes/api.js`, add the import near the other route imports (after `const webhookRoutes = require('./webhook.route');`):

```javascript
const uploadsRoutes = require('./uploads.route');
```

Add to the `endpoints` object in the `GET /` handler:

```javascript
      uploads: '/api/uploads',
```

Add the mount near the other `router.use` calls (after `router.use('/webhook', webhookRoutes);`):

```javascript
router.use('/uploads', uploadsRoutes);
```

- [ ] **Step 8: Manually verify the route is reachable**

Run: `cd backend && npm run dev` (in background), then in another terminal:
`curl -i http://localhost:5000/api/uploads/photo`
Expected: `401` with `{"success":false,"message":"Token autentikasi tidak ditemukan."}` (proves the route is mounted and auth-gated; stop the dev server after checking).

- [ ] **Step 9: Commit**

```bash
git add backend/src/middlewares/upload.middleware.js backend/src/controllers/uploads.controller.js backend/src/controllers/__tests__/uploads.controller.test.js backend/src/routes/uploads.route.js backend/src/routes/api.js
git commit -m "feat(backend): add POST /api/uploads/photo dashboard upload endpoint"
```

---

### Task 4: Cloudinary cleanup on recording update/delete (dashboard flow)

**Files:**
- Modify: `backend/src/repositories/recording.repository.js` (`createManualRecording`, lines 58-79)
- Modify: `backend/src/controllers/recording.controller.js` (`createRecording`, `updateRecording`, `deleteRecording`)
- Test: `backend/src/controllers/__tests__/recording.controller.test.js` (extend existing file)
- Test: `backend/src/repositories/__tests__/recording.repository.test.js` (new)

**Interfaces:**
- Consumes: `cloudinaryService.deleteImage(publicId)` (Task 2), `recordingRepository.findRecordingById(id)` (already exists).
- Produces: `createManualRecording` now also persists `photoPublicId`; `updateRecording`/`deleteRecording` controllers now call `cloudinaryService.deleteImage` on the old asset when replaced/deleted.

- [ ] **Step 1: Write the failing repository test for `createManualRecording`**

Create `backend/src/repositories/__tests__/recording.repository.test.js`:

```javascript
const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  recording: {
    create: jest.fn(),
  },
}));

const { createManualRecording } = require('../recording.repository');

describe('createManualRecording', () => {
  it('persists photoUrl and photoPublicId when provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    await createManualRecording({
      goatId: 'g1',
      senderName: 'Admin Satu',
      photoUrl: 'https://res.cloudinary.com/demo/x.jpg',
      photoPublicId: 'recording-ternak/dashboard/x',
    });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        photoUrl: 'https://res.cloudinary.com/demo/x.jpg',
        photoPublicId: 'recording-ternak/dashboard/x',
      }),
    });
  });

  it('defaults photoPublicId to null when not provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    await createManualRecording({ goatId: 'g1', senderName: 'Admin Satu' });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoPublicId: null }),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/repositories/__tests__/recording.repository.test.js`
Expected: FAIL — `photoPublicId` is `undefined` in the actual call, not matching `expect.objectContaining`.

- [ ] **Step 3: Update `createManualRecording` to accept and persist `photoPublicId`**

In `backend/src/repositories/recording.repository.js`, replace the `createManualRecording` function (lines 58-79):

```javascript
const createManualRecording = async ({
  goatId, senderName, matingDate, birthDate, maleKidCount, femaleKidCount,
  matingNumber, saleTarget, sold, notes, photoUrl, photoPublicId,
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
      photoPublicId: photoPublicId || null,
      status: 'FINAL',
      source: 'MANUAL',
    },
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/repositories/__tests__/recording.repository.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Write failing controller tests for photo cleanup on update/delete**

In `backend/src/controllers/__tests__/recording.controller.test.js`, add `require('../../services/cloudinary.service')`, `jest.mock` it, and add these `describe` blocks (append to the file, keep existing content):

```javascript
const cloudinaryService = require('../../services/cloudinary.service');
jest.mock('../../services/cloudinary.service');

const { deleteRecording } = require('../recording.controller');

describe('updateRecording photo replacement', () => {
  it('deletes the old Cloudinary asset when photoUrl changes and an old photoPublicId exists', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({
      id: 'r1', photoUrl: 'https://res.cloudinary.com/demo/old.jpg', photoPublicId: 'recording-ternak/dashboard/old',
    });
    recordingRepository.updateRecording.mockResolvedValue({ id: 'r1', photoUrl: 'https://res.cloudinary.com/demo/new.jpg' });

    const req = {
      params: { id: 'r1' },
      body: { photoUrl: 'https://res.cloudinary.com/demo/new.jpg', photoPublicId: 'recording-ternak/dashboard/new' },
    };
    const res = buildRes();

    await updateRecording(req, res);

    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/dashboard/old');
    expect(recordingRepository.updateRecording).toHaveBeenCalledWith('r1', expect.objectContaining({
      photoUrl: 'https://res.cloudinary.com/demo/new.jpg',
      photoPublicId: 'recording-ternak/dashboard/new',
    }));
  });

  it('does not call deleteImage when photoUrl is unchanged', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({
      id: 'r1', photoUrl: 'https://res.cloudinary.com/demo/same.jpg', photoPublicId: 'recording-ternak/dashboard/same',
    });
    recordingRepository.updateRecording.mockResolvedValue({ id: 'r1' });

    const req = { params: { id: 'r1' }, body: { notes: 'update catatan saja' } };
    const res = buildRes();

    await updateRecording(req, res);

    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });
});

describe('deleteRecording', () => {
  it('deletes the Cloudinary asset when the recording has a photoPublicId', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({ id: 'r1', photoPublicId: 'recording-ternak/dashboard/old' });
    recordingRepository.deleteRecording.mockResolvedValue({ id: 'r1' });

    const req = { params: { id: 'r1' } };
    const res = buildRes();

    await deleteRecording(req, res);

    expect(recordingRepository.deleteRecording).toHaveBeenCalledWith('r1');
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/dashboard/old');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('skips Cloudinary cleanup when there is no photoPublicId', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({ id: 'r1', photoPublicId: null });
    recordingRepository.deleteRecording.mockResolvedValue({ id: 'r1' });

    const req = { params: { id: 'r1' } };
    const res = buildRes();

    await deleteRecording(req, res);

    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd backend && npx jest src/controllers/__tests__/recording.controller.test.js`
Expected: FAIL — `findRecordingById` not called by `updateRecording`/`deleteRecording` yet, `deleteImage` never invoked.

- [ ] **Step 7: Update `recording.controller.js`**

In `backend/src/controllers/recording.controller.js`:

Add the import at the top (after line 1):

```javascript
const cloudinaryService = require('../services/cloudinary.service');
```

In `createRecording` (lines 51-85), destructure `photoPublicId` too and pass it through:

```javascript
exports.createRecording = async (req, res) => {
  try {
    const {
      goatId, matingDate, birthDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, notes, photoUrl, photoPublicId,
    } = req.body;

    if (!goatId) {
      return res.status(400).json({ success: false, message: 'goatId wajib diisi.' });
    }

    const recording = await recordingRepository.createManualRecording({
      goatId,
      senderName: req.user.name,
      matingDate, birthDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, notes, photoUrl, photoPublicId,
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
```

Replace `updateRecording` (lines 87-135):

```javascript
exports.updateRecording = async (req, res) => {
  try {
    const {
      matingDate, birthDate, maleKidCount, femaleKidCount,
      matingNumber, saleTarget, sold, notes, photoUrl, photoPublicId, status,
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
    console.error('Update Recording Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui recording.',
      error: error.message,
    });
  }
};
```

Replace `deleteRecording` (lines 137-152):

```javascript
exports.deleteRecording = async (req, res) => {
  try {
    const existing = await recordingRepository.findRecordingById(req.params.id);
    await recordingRepository.deleteRecording(req.params.id);

    if (existing && existing.photoPublicId) {
      cloudinaryService.deleteImage(existing.photoPublicId);
    }

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

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend && npx jest src/controllers/__tests__/recording.controller.test.js src/repositories/__tests__/recording.repository.test.js`
Expected: PASS (all tests in both files)

- [ ] **Step 9: Run the full test suite to check for regressions**

Run: `cd backend && npx jest`
Expected: PASS, no failing suites

- [ ] **Step 10: Commit**

```bash
git add backend/src/controllers/recording.controller.js backend/src/repositories/recording.repository.js backend/src/controllers/__tests__/recording.controller.test.js backend/src/repositories/__tests__/recording.repository.test.js
git commit -m "feat(backend): clean up old Cloudinary asset on recording photo replace/delete"
```

---

### Task 5: WhatsApp media download (`whatsapp.service.js`)

**Files:**
- Modify: `backend/src/services/whatsapp.service.js`
- Test: `backend/src/services/__tests__/whatsapp.service.test.js` (new)

**Interfaces:**
- Consumes: `config.whatsapp.accessToken` (existing).
- Produces:
  - `getMediaUrl(mediaId: string): Promise<{ url: string, mimeType: string }>`
  - `downloadMedia(url: string): Promise<Buffer>`

  Both consumed by Task 6 (`recording.service.handleImageMessage`).

- [ ] **Step 1: Write the failing tests**

Create `backend/src/services/__tests__/whatsapp.service.test.js`:

```javascript
const { getMediaUrl, downloadMedia } = require('../whatsapp.service');

describe('getMediaUrl', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('fetches the media metadata and returns url and mimeType', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://lookaside.fbsbx.com/media/abc', mime_type: 'image/jpeg' }),
    });

    const result = await getMediaUrl('media-id-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/media-id-123'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }) })
    );
    expect(result).toEqual({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
  });

  it('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'not found' }) });

    await expect(getMediaUrl('bad-id')).rejects.toThrow();
  });
});

describe('downloadMedia', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('downloads the media bytes as a Buffer', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3]).buffer;
    global.fetch.mockResolvedValue({ ok: true, arrayBuffer: async () => fakeBytes });

    const buffer = await downloadMedia('https://lookaside.fbsbx.com/media/abc');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer).toEqual(Buffer.from([1, 2, 3]));
  });

  it('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    await expect(downloadMedia('https://lookaside.fbsbx.com/media/abc')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/__tests__/whatsapp.service.test.js`
Expected: FAIL — `getMediaUrl`/`downloadMedia` are not exported yet.

- [ ] **Step 3: Implement the new functions**

Replace the full contents of `backend/src/services/whatsapp.service.js`:

```javascript
const config = require('../config');

const sendTextMessage = async (recipientPhone, text) => {
  const url = `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
};

const getMediaUrl = async (mediaId) => {
  const url = `https://graph.facebook.com/v21.0/${mediaId}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.whatsapp.accessToken}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  const data = await response.json();
  return { url: data.url, mimeType: data.mime_type };
};

const downloadMedia = async (url) => {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.whatsapp.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengunduh media WhatsApp: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

module.exports = { sendTextMessage, getMediaUrl, downloadMedia };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/__tests__/whatsapp.service.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/whatsapp.service.js backend/src/services/__tests__/whatsapp.service.test.js
git commit -m "feat(backend): add WhatsApp media download functions"
```

---

### Task 6: Propagate `photo` through `handleMessage` and `saveReport`

**Files:**
- Modify: `backend/src/services/recording.service.js`
- Modify: `backend/src/repositories/recording.repository.js` (`createRecording`, lines 3-18)
- Test: `backend/src/services/__tests__/recording.service.test.js` (new)
- Test: extend `backend/src/repositories/__tests__/recording.repository.test.js` (from Task 4)

**Interfaces:**
- Consumes: nothing new externally (pure refactor of existing internal flow).
- Produces:
  - `handleMessage(messageText, senderPhone, senderName, photo = null)` — `photo` is `{ url, publicId } | null`.
  - `recordingRepository.createRecording(recordingData)` now also accepts `recordingData.photoUrl` / `recordingData.photoPublicId` and persists them.

  Consumed by Task 7 (`handleImageMessage`).

- [ ] **Step 1: Write the failing repository test for `createRecording` photo fields**

Append to `backend/src/repositories/__tests__/recording.repository.test.js`:

```javascript
describe('createRecording', () => {
  it('persists photoUrl and photoPublicId when provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    const { createRecording } = require('../recording.repository');
    await createRecording({
      kambingId: 'g1',
      pengirim: 'Budi',
      photoUrl: 'https://res.cloudinary.com/demo/wa.jpg',
      photoPublicId: 'recording-ternak/whatsapp/wa',
    });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        photoUrl: 'https://res.cloudinary.com/demo/wa.jpg',
        photoPublicId: 'recording-ternak/whatsapp/wa',
      }),
    });
  });

  it('defaults photo fields to null when not provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    const { createRecording } = require('../recording.repository');
    await createRecording({ kambingId: 'g1', pengirim: 'Budi' });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoUrl: null, photoPublicId: null }),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/repositories/__tests__/recording.repository.test.js`
Expected: FAIL — `photoUrl`/`photoPublicId` not present in the actual `data` object passed to `prisma.recording.create`.

- [ ] **Step 3: Update `createRecording` in the repository**

In `backend/src/repositories/recording.repository.js`, replace the `createRecording` function (lines 3-18):

```javascript
const createRecording = async (recordingData) => {
  return await prisma.recording.create({
    data: {
      goatId: recordingData.kambingId,
      senderName: recordingData.pengirim,
      matingDate: recordingData.tanggal_kawin || '-',
      birthDate: recordingData.tanggal_beranak || '-',
      maleKidCount: String(recordingData.jumlah_anak_jantan || '-'),
      femaleKidCount: String(recordingData.jumlah_anak_betina || '-'),
      matingNumber: String(recordingData.perkawinan_ke || '-'),
      saleTarget: recordingData.target_penjualan || '-',
      sold: recordingData.terjual || '-',
      notes: recordingData.catatan || '-',
      photoUrl: recordingData.photoUrl || null,
      photoPublicId: recordingData.photoPublicId || null,
    }
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/repositories/__tests__/recording.repository.test.js`
Expected: PASS (6 tests total in this file)

- [ ] **Step 5: Write the failing service tests for photo propagation**

Create `backend/src/services/__tests__/recording.service.test.js`:

```javascript
jest.mock('../gemini.service');
jest.mock('../session.service');
jest.mock('../../repositories/farmer.repository');
jest.mock('../../repositories/goat.repository');
jest.mock('../../repositories/recording.repository');
jest.mock('../sheets.service');
jest.mock('../whatsapp.service');
jest.mock('../query.service');
jest.mock('../sync.service');
jest.mock('../chat-history.service');

const { parseMessage } = require('../gemini.service');
const { setSession, getSession, clearSession } = require('../session.service');
const { findOrCreateFarmer } = require('../../repositories/farmer.repository');
const { findOrCreateGoat } = require('../../repositories/goat.repository');
const { createRecording } = require('../../repositories/recording.repository');
const { sendTextMessage } = require('../whatsapp.service');
const { buildHistoryContext, logTurn, pruneHistory } = require('../chat-history.service');
const { verifySheetsConsistency } = require('../sync.service');

const { handleMessage } = require('../recording.service');

const PHOTO = { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' };

beforeEach(() => {
  buildHistoryContext.mockResolvedValue('');
  pruneHistory.mockResolvedValue();
  logTurn.mockResolvedValue();
  verifySheetsConsistency.mockResolvedValue();
  sendTextMessage.mockResolvedValue({});
});

describe('handleMessage photo propagation', () => {
  it('stores the photo on session data when asking for nomor telinga', async () => {
    getSession.mockResolvedValue(null);
    parseMessage.mockResolvedValue({
      bukan_laporan_ternak: false,
      nomor_telinga: '-',
      nama_peternak: 'Budi',
    });

    await handleMessage('kambing beranak 2 ekor', '628123', 'Budi', PHOTO);

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_nomor_telinga',
      expect.objectContaining({ photo: PHOTO })
    );
  });

  it('carries the photo from awaiting_nomor_telinga into awaiting_confirmation', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_nomor_telinga',
      data: { parsed: { nama_peternak: 'Budi' }, namaPeternak: 'Budi', photo: PHOTO },
    });

    await handleMessage('12', '628123', 'Budi');

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: PHOTO })
    );
  });

  it('passes photoUrl/photoPublicId to createRecording on confirmation', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_confirmation',
      data: {
        parsed: { tanggal_kawin: '-', tanggal_beranak: '-', jumlah_anak_jantan: '-', jumlah_anak_betina: '-', perkawinan_ke: '-', target_penjualan: '-', terjual: '-', catatan: '-' },
        nomorTelinga: '12',
        namaPeternak: 'Budi',
        photo: PHOTO,
      },
    });
    findOrCreateFarmer.mockResolvedValue({ id: 'f1', name: 'Budi', address: '-', whatsappPhone: '628123' });
    findOrCreateGoat.mockResolvedValue({ id: 'g1', earTagNumber: '12' });
    createRecording.mockResolvedValue({ id: 'r1' });
    clearSession.mockResolvedValue();

    await handleMessage('ya', '628123', 'Budi');

    expect(createRecording).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: PHOTO.url, photoPublicId: PHOTO.publicId })
    );
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/__tests__/recording.service.test.js`
Expected: FAIL — `photo` not present in `session.data`/`createRecording` call args (handleMessage doesn't accept/thread a 4th param yet).

- [ ] **Step 7: Thread `photo` through `handleMessage` and `saveReport`**

In `backend/src/services/recording.service.js`:

Replace the `saveReport` function (lines 101-160) — add `photoUrl`/`photoPublicId` to the `createRecording` call:

```javascript
const saveReport = async (pendingData, peternak) => {
  const { parsed, nomorTelinga, photo } = pendingData;

  // Simpan ke database
  const kambing = await findOrCreateGoat(nomorTelinga, peternak.id);
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
    catatan: parsed.catatan,
    photoUrl: photo?.url,
    photoPublicId: photo?.publicId,
  });

  const timestamp = formatTimestamp();
  const terdaftar = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

  // Simpan ke 3 sheet Google Spreadsheet secara paralel
  await Promise.all([
    // Sheet Recording: satu baris per laporan
    appendRecording({
      timestamp,
      nomor_telinga: nomorTelinga,
      nama_peternak: peternak.name,
      tanggal_kawin: parsed.tanggal_kawin,
      tanggal_beranak: parsed.tanggal_beranak,
      jumlah_anak_jantan: parsed.jumlah_anak_jantan,
      jumlah_anak_betina: parsed.jumlah_anak_betina,
      perkawinan_ke: parsed.perkawinan_ke,
      target_penjualan: parsed.target_penjualan,
      terjual: parsed.terjual,
      catatan: parsed.catatan,
    }),
    // Sheet Kambing: upsert agar tidak duplikat
    upsertKambing({
      nomor_telinga: nomorTelinga,
      nama_peternak: peternak.name,
      whatsapp_phone: peternak.whatsappPhone,
      createdAt: terdaftar,
    }),
    // Sheet Peternak: upsert agar tidak duplikat
    upsertPeternak({
      nama: peternak.name,
      alamat: peternak.address,
      whatsapp_phone: peternak.whatsappPhone,
      createdAt: terdaftar,
    }),
  ]);

  // Jalankan verifikasi konsistensi secara async (tidak memblokir response ke user)
  verifySheetsConsistency().catch((err) =>
    console.error('❌ Consistency check error (non-critical):', err.message)
  );

  return { kambing, recording };
};
```

Replace the `handleMessage` function signature (line 164) and each `setSession` call site so `photo` is threaded through. Full replacement of `handleMessage` (lines 164-354):

```javascript
const handleMessage = async (messageText, senderPhone, senderName, photo = null) => {
  pruneHistory(senderPhone).catch((err) =>
    console.error('❌ Gagal membersihkan riwayat percakapan lama:', err.message)
  );

  let historyContext = '';
  try {
    historyContext = await buildHistoryContext(senderPhone);
  } catch (err) {
    console.error('❌ Gagal mengambil riwayat percakapan:', err.message);
  }

  const logReply = (reply) =>
    logTurn(senderPhone, messageText, reply).catch((err) =>
      console.error('❌ Gagal mencatat riwayat percakapan:', err.message)
    );

  const session = await getSession(senderPhone);
  const carriedPhoto = photo || session?.data?.photo || null;

  // ── State: awaiting_confirmation ─────────────────────────────────────────
  if (session?.state === 'awaiting_confirmation') {
    if (isKonfirmasiYa(messageText)) {
      const peternak = await findOrCreateFarmer(senderPhone, {
        nama: session.data.namaPeternak,
        alamat: session.data.parsed.alamat,
      });
      await clearSession(senderPhone);

      const { kambing } = await saveReport({ ...session.data, photo: carriedPhoto }, peternak);
      const reply = buildSuksesMessage(session.data.parsed, session.data.nomorTelinga, peternak.name);
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'saved', nomorTelinga: kambing.earTagNumber };
    }

    if (isKonfirmasiTidak(messageText)) {
      await clearSession(senderPhone);
      const reply = '❌ Laporan dibatalkan.\n\nSilakan kirim ulang laporan yang benar ya, Pak/Bu. 🙏';
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'cancelled' };
    }

    // Pesan tidak jelas ya/tidak — cek apakah ini revisi, pembatalan tidak langsung, atau pertanyaan
    try {
      const classification = await classifyMessageInConfirmation(
        messageText,
        senderName,
        session.data,
        historyContext
      );

      if (classification.intent === 'PEMBATALAN') {
        await clearSession(senderPhone);
        const reply = '❌ Laporan dibatalkan.\n\nSilakan kirim ulang laporan yang benar ya, Pak/Bu. 🙏';
        await sendTextMessage(senderPhone, reply);
        logReply(reply);
        return { state: 'cancelled' };
      }

      if (classification.intent === 'REVISI') {
        // User mengirim revisi laporan — ganti data pending dengan yang baru
        const parsed = classification.parsed;
        const nomorTelingaRaw = (parsed.nomor_telinga || '').trim();
        const nomorTelinga = nomorTelingaRaw !== '-' ? nomorTelingaRaw.replace(/\D/g, '') : '';
        const namaPeternak = parsed.nama_peternak && parsed.nama_peternak !== '-'
          ? parsed.nama_peternak
          : session.data.namaPeternak;

        if (!nomorTelinga) {
          // Revisi tanpa nomor telinga — tanya nomor telinga
          await clearSession(senderPhone);
          await setSession(senderPhone, 'awaiting_nomor_telinga', { parsed, namaPeternak, photo: carriedPhoto });
          const reply = `Baik, laporan diperbarui 🔄\n\nBoleh minta nomor telinga/ID kambingnya, Pak/Bu?\n_(Mohon masukkan angka saja, contoh: 12, 105)_`;
          await sendTextMessage(senderPhone, reply);
          logReply(reply);
          return { state: 'awaiting_nomor_telinga' };
        }

        // Revisi lengkap — tampilkan konfirmasi baru
        const newSessionData = { parsed, nomorTelinga, namaPeternak, photo: carriedPhoto };
        await clearSession(senderPhone);
        await setSession(senderPhone, 'awaiting_confirmation', newSessionData);
        const summary = buildKonfirmasiMessage(parsed, nomorTelinga, namaPeternak);
        const reply = `🔄 *Laporan diperbarui. Berikut ringkasan terbaru:*\n\n${summary}`;
        await sendTextMessage(senderPhone, reply);
        logReply(reply);
        return { state: 'awaiting_confirmation' };
      }

      // PERTANYAAN — jawab pertanyaan/obrolan, pertahankan sesi konfirmasi
      const chatReply = await generateChatReply(
        messageText,
        senderName,
        'User masih punya laporan yang menunggu konfirmasi. Setelah menjawab, ingatkan user untuk membalas ya/tidak untuk laporannya.',
        historyContext
      );
      await sendTextMessage(senderPhone, chatReply);
      logReply(chatReply);
      return { state: 'chat_while_pending' };
    } catch (err) {
      console.error('❌ Error classifying message in confirmation:', err);
      // Fallback — ingatkan user
      const reply = 'Mohon balas *ya* untuk menyimpan laporan, atau *tidak* untuk membatalkan. 🙏';
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'waiting_clarification' };
    }
  }

  // ── State: awaiting_nomor_telinga ─────────────────────────────────────────
  if (session?.state === 'awaiting_nomor_telinga') {
    const nomorTelinga = messageText.replace(/\D/g, ''); // Ambil hanya angka bulat
    if (!nomorTelinga) {
      const reply = 'Mohon masukkan nomor telinga kambing berupa angka bulat saja ya, Pak/Bu.\n_(Contoh: 12, 105)_';
      await sendTextMessage(senderPhone, reply);
      logReply(reply);
      return { state: 'waiting_nomor_telinga' };
    }

    // Update sesi dengan nomor telinga dan lanjut ke konfirmasi
    const updatedData = { ...session.data, nomorTelinga, photo: carriedPhoto };
    await clearSession(senderPhone);
    await setSession(senderPhone, 'awaiting_confirmation', updatedData);

    const reply = buildKonfirmasiMessage(session.data.parsed, nomorTelinga, session.data.namaPeternak);
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'awaiting_confirmation' };
  }

  // ── Tidak ada sesi aktif — proses pesan baru dengan AI ───────────────────
  let parsed;
  try {
    parsed = await parseMessage(messageText, senderName, historyContext);
  } catch (err) {
    console.error('❌ Gagal parsing pesan:', err);
    const reply = 'Maaf, sistem sedang gangguan. Silakan coba lagi beberapa menit lagi ya, Pak/Bu. 🙏';
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'error' };
  }

  // Bukan laporan ternak — cek apakah ini pertanyaan tentang data
  if (parsed.bukan_laporan_ternak) {
    if (isDataQuery(messageText)) {
      // Ada kata kunci data/ternak → query DB dan jawab
      try {
        const dataReply = await handleDataQuery(messageText, senderPhone, senderName, historyContext);
        await sendTextMessage(senderPhone, dataReply);
        logReply(dataReply);
        return { state: 'data_query_replied' };
      } catch (err) {
        console.error('❌ Gagal menangani data query:', err);
        // Fallback ke chat reply biasa
      }
    }

    // Pesan umum/obrolan → balas dengan chat ramah
    let reply;
    try {
      reply = await generateChatReply(messageText, senderName, null, historyContext);
    } catch {
      reply = 'Halo! Ada yang bisa saya bantu? Silakan kirim laporan ternak kambing Anda ya, Pak/Bu. 🐐';
    }
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'chat_replied' };
  }

  // Laporan ternak — cek nomor telinga
  const nomorTelingaRaw = (parsed.nomor_telinga || '').trim();
  const nomorTelinga = nomorTelingaRaw !== '-' ? nomorTelingaRaw.replace(/\D/g, '') : '';
  const namaPeternak = parsed.nama_peternak && parsed.nama_peternak !== '-' ? parsed.nama_peternak : senderName;

  if (!nomorTelinga) {
    // Nomor telinga tidak disebutkan — tanya dulu tanpa AI
    await setSession(senderPhone, 'awaiting_nomor_telinga', { parsed, namaPeternak, photo: carriedPhoto });
    const reply = `Terima kasih laporan dari *${namaPeternak}* 🙏\n\nBoleh minta nomor telinga/ID kambingnya, Pak/Bu?\n_(Mohon masukkan angka saja, contoh: 12, 105)_`;
    await sendTextMessage(senderPhone, reply);
    logReply(reply);
    return { state: 'awaiting_nomor_telinga' };
  }

  // Semua data cukup — kirim ringkasan konfirmasi
  await setSession(senderPhone, 'awaiting_confirmation', { parsed, nomorTelinga, namaPeternak, photo: carriedPhoto });
  const reply = buildKonfirmasiMessage(parsed, nomorTelinga, namaPeternak);
  await sendTextMessage(senderPhone, reply);
  logReply(reply);
  return { state: 'awaiting_confirmation' };
};
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/__tests__/recording.service.test.js`
Expected: PASS (3 tests)

- [ ] **Step 9: Run the full test suite to check for regressions**

Run: `cd backend && npx jest`
Expected: PASS, no failing suites

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/recording.service.js backend/src/repositories/recording.repository.js backend/src/services/__tests__/recording.service.test.js backend/src/repositories/__tests__/recording.repository.test.js
git commit -m "feat(backend): thread photo through handleMessage session state into saveReport"
```

---

### Task 7: WhatsApp image message handling (`handleImageMessage`)

**Files:**
- Modify: `backend/src/services/recording.service.js`
- Modify: `backend/src/controllers/webhook.controller.js`
- Test: extend `backend/src/services/__tests__/recording.service.test.js`

**Interfaces:**
- Consumes: `whatsapp.getMediaUrl`, `whatsapp.downloadMedia` (Task 5), `cloudinaryService.uploadImage` (Task 2), `session.getSession`/`setSession` (existing), `handleMessage(messageText, senderPhone, senderName, photo)` (Task 6).
- Produces: `handleImageMessage(mediaId, caption, senderPhone, senderName)` exported from `recording.service.js`, called from `webhook.controller.js` for `message.type === 'image'`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/services/__tests__/recording.service.test.js`:

```javascript
const whatsappService = require('../whatsapp.service');
const cloudinaryService = require('../cloudinary.service');
jest.mock('../cloudinary.service');

const { handleImageMessage } = require('../recording.service');

describe('handleImageMessage', () => {
  it('asks for text report and does not upload when there is no caption and no active session', async () => {
    getSession.mockResolvedValue(null);

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(whatsappService.getMediaUrl).not.toHaveBeenCalled();
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.stringContaining('teks'));
    expect(result.state).toBe('photo_without_context');
  });

  it('uploads and merges the photo into an active awaiting_confirmation session when there is no caption', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_confirmation',
      data: { parsed: { nama_peternak: 'Budi' }, nomorTelinga: '12', namaPeternak: 'Budi' },
    });
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(Buffer.from('bytes'), 'recording-ternak/whatsapp');
    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' } })
    );
    expect(result.state).toBe('photo_attached');
  });

  it('uploads and feeds the caption through handleMessage when a caption is present', async () => {
    getSession.mockResolvedValue(null);
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });
    parseMessage.mockResolvedValue({ bukan_laporan_ternak: false, nomor_telinga: '12', nama_peternak: 'Budi' });

    const result = await handleImageMessage('media-1', 'kambing 12 beranak 2 ekor', '628123', 'Budi');

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' } })
    );
    expect(result.state).toBe('awaiting_confirmation');
  });

  it('rejects an unsupported mime type without uploading to Cloudinary', async () => {
    getSession.mockResolvedValue(null);
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/gif' });

    const result = await handleImageMessage('media-1', 'kambing 12 beranak', '628123', 'Budi');

    expect(whatsappService.downloadMedia).not.toHaveBeenCalled();
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    expect(result.state).toBe('invalid_photo');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/services/__tests__/recording.service.test.js`
Expected: FAIL — `handleImageMessage` is not exported yet.

- [ ] **Step 3: Implement `handleImageMessage`**

In `backend/src/services/recording.service.js`, add the import at the top (after line 10, alongside the other requires):

```javascript
const { getMediaUrl, downloadMedia } = require('./whatsapp.service');
const cloudinaryService = require('./cloudinary.service');
```

Add these constants near the other constants (after `DEFAULT_UNSUPPORTED_REPLY`, around line 41):

```javascript
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const PENDING_SESSION_STATES = ['awaiting_confirmation', 'awaiting_nomor_telinga'];
```

Add the `handleImageMessage` function at the end of the file, right before the `module.exports` line:

```javascript
const handleImageMessage = async (mediaId, caption, senderPhone, senderName) => {
  const trimmedCaption = (caption || '').trim();
  const session = await getSession(senderPhone);
  const hasPendingSession = session && PENDING_SESSION_STATES.includes(session.state);

  if (!trimmedCaption && !hasPendingSession) {
    const reply = 'Terima kasih fotonya, Pak/Bu 📸 Boleh minta juga laporannya dalam bentuk teks?';
    await sendTextMessage(senderPhone, reply);
    logTurn(senderPhone, '[image]', reply).catch((err) =>
      console.error('❌ Gagal mencatat riwayat pesan foto:', err.message)
    );
    return { state: 'photo_without_context' };
  }

  const { url: mediaUrl, mimeType } = await getMediaUrl(mediaId);

  if (!ALLOWED_PHOTO_MIME_TYPES.includes(mimeType)) {
    const reply = 'Maaf, format fotonya belum didukung, Pak/Bu 🙏 Mohon kirim foto JPEG atau PNG.';
    await sendTextMessage(senderPhone, reply);
    return { state: 'invalid_photo' };
  }

  const buffer = await downloadMedia(mediaUrl);

  if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
    const reply = 'Maaf, ukuran fotonya terlalu besar, Pak/Bu 🙏 Mohon kirim foto di bawah 5MB.';
    await sendTextMessage(senderPhone, reply);
    return { state: 'invalid_photo' };
  }

  const { url, publicId } = await cloudinaryService.uploadImage(buffer, 'recording-ternak/whatsapp');
  const photo = { url, publicId };

  if (!trimmedCaption) {
    await setSession(senderPhone, session.state, { ...session.data, photo });
    const reply = '📸 Foto diterima, sudah ditambahkan ke laporan yang sedang diproses.';
    await sendTextMessage(senderPhone, reply);
    return { state: 'photo_attached' };
  }

  return handleMessage(trimmedCaption, senderPhone, senderName, photo);
};
```

Update the `module.exports` line (last line) to include the new function:

```javascript
module.exports = { handleMessage, handleUnsupportedMessage, handleImageMessage };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/services/__tests__/recording.service.test.js`
Expected: PASS (7 tests total in this file)

- [ ] **Step 5: Wire the webhook controller to route image messages here**

In `backend/src/controllers/webhook.controller.js`, replace line 2 and the `if (message.type === 'text')` block (lines 41-48):

```javascript
const { handleMessage, handleUnsupportedMessage, handleImageMessage } = require('../services/recording.service');
```

```javascript
    let result;
    if (message.type === 'text') {
      const messageText = message.text.body;
      console.log(`📩 [${senderName}] ${messageText}`);
      result = await handleMessage(messageText, senderPhone, senderName);
    } else if (message.type === 'image') {
      const caption = message.image?.caption || '';
      console.log(`📩 [${senderName}] <image> ${caption}`);
      result = await handleImageMessage(message.image.id, caption, senderPhone, senderName);
    } else {
      console.log(`📩 [${senderName}] <${message.type}>`);
      result = await handleUnsupportedMessage(message.type, senderPhone, senderName);
    }
```

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `cd backend && npx jest`
Expected: PASS, no failing suites

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/recording.service.js backend/src/controllers/webhook.controller.js backend/src/services/__tests__/recording.service.test.js
git commit -m "feat(backend): handle WhatsApp image messages and upload photos to Cloudinary"
```

---

## Post-Implementation Notes

- The user must add real `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` values to `backend/.env` (and to Vercel project env vars for deployment) — these are not committed.
- Frontend wiring (calling `POST /api/uploads/photo` before submitting the recording form) is out of scope for this plan.

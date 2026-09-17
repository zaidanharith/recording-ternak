const recordingRepository = require('../../repositories/recording.repository');

jest.mock('../../repositories/recording.repository');

const cloudinaryService = require('../../services/cloudinary.service');
jest.mock('../../services/cloudinary.service');

const { createRecording, updateRecording, listRecordings, deleteRecording } = require('../recording.controller');

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

describe('updateRecording photo replacement', () => {
  it('deletes Cloudinary assets removed from photoPublicIds', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({
      id: 'r1',
      photoUrls: ['https://res.cloudinary.com/demo/old.jpg', 'https://res.cloudinary.com/demo/kept.jpg'],
      photoPublicIds: ['recording-ternak/dashboard/old', 'recording-ternak/dashboard/kept'],
    });
    recordingRepository.updateRecording.mockResolvedValue({ id: 'r1', photoUrls: ['https://res.cloudinary.com/demo/kept.jpg'] });

    const req = {
      params: { id: 'r1' },
      body: {
        photoUrls: ['https://res.cloudinary.com/demo/kept.jpg'],
        photoPublicIds: ['recording-ternak/dashboard/kept'],
      },
    };
    const res = buildRes();

    await updateRecording(req, res);

    expect(cloudinaryService.deleteImage).toHaveBeenCalledTimes(1);
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/dashboard/old');
    expect(recordingRepository.updateRecording).toHaveBeenCalledWith('r1', expect.objectContaining({
      photoUrls: ['https://res.cloudinary.com/demo/kept.jpg'],
      photoPublicIds: ['recording-ternak/dashboard/kept'],
    }));
  });

  it('does not call deleteImage when photoPublicIds is unchanged', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({
      id: 'r1', photoUrls: ['https://res.cloudinary.com/demo/same.jpg'], photoPublicIds: ['recording-ternak/dashboard/same'],
    });
    recordingRepository.updateRecording.mockResolvedValue({ id: 'r1' });

    const req = { params: { id: 'r1' }, body: { notes: 'update catatan saja' } };
    const res = buildRes();

    await updateRecording(req, res);

    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });
});

describe('deleteRecording', () => {
  it('deletes every Cloudinary asset when the recording has photoPublicIds', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({
      id: 'r1', photoPublicIds: ['recording-ternak/dashboard/old', 'recording-ternak/dashboard/old2'],
    });
    recordingRepository.deleteRecording.mockResolvedValue({ id: 'r1' });

    const req = { params: { id: 'r1' } };
    const res = buildRes();

    await deleteRecording(req, res);

    expect(recordingRepository.deleteRecording).toHaveBeenCalledWith('r1');
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/dashboard/old');
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/dashboard/old2');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('skips Cloudinary cleanup when there are no photoPublicIds', async () => {
    recordingRepository.findRecordingById.mockResolvedValue({ id: 'r1', photoPublicIds: [] });
    recordingRepository.deleteRecording.mockResolvedValue({ id: 'r1' });

    const req = { params: { id: 'r1' } };
    const res = buildRes();

    await deleteRecording(req, res);

    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });
});

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

  it('rejects a malformed startDate', async () => {
    const req = { query: { format: 'xlsx', startDate: 'not-a-date' } };
    const res = buildRes();

    await exportRecordings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.exportRecordings).not.toHaveBeenCalled();
  });

  it('rejects a malformed endDate', async () => {
    const req = { query: { format: 'xlsx', endDate: 'not-a-date' } };
    const res = buildRes();

    await exportRecordings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(recordingRepository.exportRecordings).not.toHaveBeenCalled();
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

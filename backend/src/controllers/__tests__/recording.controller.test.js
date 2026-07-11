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

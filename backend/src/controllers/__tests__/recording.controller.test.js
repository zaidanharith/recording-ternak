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

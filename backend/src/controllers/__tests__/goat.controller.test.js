const goatRepository = require('../../repositories/goat.repository');

jest.mock('../../repositories/goat.repository');

const exportService = require('../../services/export.service');
jest.mock('../../services/export.service');

const { createGoat, updateGoat, getNextEarTagNumber, getGoat, exportGoats } = require('../goat.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn(),
  send: jest.fn(),
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

  it('returns 409 with a registration-specific message when registrationNumber is duplicated', async () => {
    goatRepository.createGoat.mockRejectedValue({ code: 'P2002', meta: { target: ['goat_registration_number_key'] } });
    const req = { body: { earTagNumber: '12', farmerId: 'f1', registrationNumber: 'REG1' } };
    const res = buildRes();

    await createGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Nomor registrasi sudah digunakan.' })
    );
  });

  it('rejects an invalid jenisKelamin value', async () => {
    const req = { body: { earTagNumber: '12', farmerId: 'f1', jenisKelamin: 'ENTAH' } };
    const res = buildRes();

    await createGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.createGoat).not.toHaveBeenCalled();
  });

  it('passes new detail fields through to the repository', async () => {
    goatRepository.createGoat.mockResolvedValue({ id: 'g1' });
    const req = {
      body: {
        earTagNumber: '12', farmerId: 'f1', registrationNumber: 'REG1',
        jenisKelamin: 'JANTAN', rasRumpun: 'Etawa', birthDate: '2024-01-01',
      },
    };
    const res = buildRes();

    await createGoat(req, res);

    expect(goatRepository.createGoat).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationNumber: 'REG1', jenisKelamin: 'JANTAN', rasRumpun: 'Etawa', birthDate: new Date('2024-01-01'),
      })
    );
  });
});

describe('updateGoat', () => {
  it('rejects an invalid initialCondition value', async () => {
    const req = { params: { id: 'g1' }, body: { initialCondition: 'LUMAYAN' } };
    const res = buildRes();

    await updateGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.updateGoat).not.toHaveBeenCalled();
  });

  it('rejects a malformed enteredAt date', async () => {
    const req = { params: { id: 'g1' }, body: { enteredAt: 'not-a-date' } };
    const res = buildRes();

    await updateGoat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.updateGoat).not.toHaveBeenCalled();
  });
});

describe('getNextEarTagNumber', () => {
  it('returns the next suggested ear tag number', async () => {
    goatRepository.getNextEarTagNumber.mockResolvedValue(13);
    const req = {};
    const res = buildRes();

    await getNextEarTagNumber(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.data.nextEarTagNumber).toBe(13);
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

describe('exportGoats', () => {
  it('rejects an invalid format', async () => {
    const req = { query: { format: 'csv' } };
    const res = buildRes();

    await exportGoats(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.exportGoats).not.toHaveBeenCalled();
  });

  it('rejects a malformed startDate', async () => {
    const req = { query: { format: 'xlsx', startDate: 'not-a-date' } };
    const res = buildRes();

    await exportGoats(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(goatRepository.exportGoats).not.toHaveBeenCalled();
  });

  it('rejects a malformed endDate', async () => {
    const req = { query: { format: 'xlsx', endDate: 'not-a-date' } };
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

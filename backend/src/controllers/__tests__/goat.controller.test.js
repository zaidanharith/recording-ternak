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

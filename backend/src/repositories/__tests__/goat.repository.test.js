const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  goat: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
}));

const { exportGoats, getNextEarTagNumber } = require('../goat.repository');

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

describe('getNextEarTagNumber', () => {
  it('returns the highest ear tag number plus one', async () => {
    prisma.goat.aggregate.mockResolvedValue({ _max: { earTagNumber: 41 } });

    const next = await getNextEarTagNumber();

    expect(prisma.goat.aggregate).toHaveBeenCalledWith({ _max: { earTagNumber: true } });
    expect(next).toBe(42);
  });

  it('returns 1 when there are no goats yet', async () => {
    prisma.goat.aggregate.mockResolvedValue({ _max: { earTagNumber: null } });

    const next = await getNextEarTagNumber();

    expect(next).toBe(1);
  });
});

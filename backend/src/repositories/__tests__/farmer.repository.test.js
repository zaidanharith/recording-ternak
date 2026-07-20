const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  farmer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

const { exportFarmers, getFarmerNameByPhone } = require('../farmer.repository');

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

  it('sorts by desa', async () => {
    prisma.farmer.findMany.mockResolvedValue([]);

    await exportFarmers({ sortBy: 'desa', sortDir: 'asc' });

    expect(prisma.farmer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { desa: 'asc' } })
    );
  });
});

describe('getFarmerNameByPhone', () => {
  it('returns the registered name for the given whatsappPhone', async () => {
    prisma.farmer.findUnique.mockResolvedValue({ name: 'Pak Budi Santoso' });

    const result = await getFarmerNameByPhone('628123');

    expect(prisma.farmer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { whatsappPhone: '628123' }, select: { name: true } })
    );
    expect(result).toEqual({ name: 'Pak Budi Santoso' });
  });

  it('returns null when no farmer exists for the given whatsappPhone', async () => {
    prisma.farmer.findUnique.mockResolvedValue(null);

    const result = await getFarmerNameByPhone('628999');

    expect(result).toBe(null);
  });
});

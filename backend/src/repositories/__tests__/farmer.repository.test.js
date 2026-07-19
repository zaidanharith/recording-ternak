const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  farmer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

const { exportFarmers, isFarmerRegistered } = require('../farmer.repository');

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

describe('isFarmerRegistered', () => {
  it('returns true when a farmer exists for the given whatsappPhone', async () => {
    prisma.farmer.findUnique.mockResolvedValue({ id: 'f1' });

    const result = await isFarmerRegistered('628123');

    expect(prisma.farmer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { whatsappPhone: '628123' } })
    );
    expect(result).toBe(true);
  });

  it('returns false when no farmer exists for the given whatsappPhone', async () => {
    prisma.farmer.findUnique.mockResolvedValue(null);

    const result = await isFarmerRegistered('628999');

    expect(result).toBe(false);
  });
});

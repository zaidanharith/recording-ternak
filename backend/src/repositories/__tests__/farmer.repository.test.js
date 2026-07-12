const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  farmer: {
    findMany: jest.fn(),
  },
}));

const { exportFarmers } = require('../farmer.repository');

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

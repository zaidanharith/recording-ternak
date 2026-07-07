const prisma = require('../lib/prisma');

/**
 * Cari kambing berdasarkan nomor telinga.
 * Jika belum ada, buat kambing baru dengan relasi ke peternak.
 */
const findOrCreateGoat = async (earTagNumber, farmerId) => {
  const cleanNomor = (earTagNumber || '').trim();

  if (!cleanNomor || cleanNomor === '-') {
    throw new Error('Nomor telinga tidak boleh kosong');
  }

  const existing = await prisma.goat.findUnique({
    where: { earTagNumber: cleanNomor },
    include: { farmer: true },
  });

  if (existing) return existing;

  return await prisma.goat.create({
    data: {
      earTagNumber: cleanNomor,
      farmerId,
    },
    include: { farmer: true },
  });
};

/**
 * Ambil semua kambing milik satu peternak.
 */
const getGoatsByFarmerId = async (farmerId) => {
  return await prisma.goat.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Cari kambing berdasarkan nomor telinga saja.
 */
const getGoatByEarTagNumber = async (earTagNumber) => {
  return await prisma.goat.findUnique({
    where: { earTagNumber: earTagNumber.trim() },
    include: { farmer: true },
  });
};

const listGoats = async ({ farmerId, page, limit }) => {
  const where = { ...(farmerId && { farmerId }) };

  const [goats, total] = await Promise.all([
    prisma.goat.findMany({
      where,
      include: { farmer: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.goat.count({ where }),
  ]);

  return { goats, total };
};

const findGoatById = async (id) => {
  return await prisma.goat.findUnique({
    where: { id },
    include: { farmer: true, recordings: { orderBy: { createdAt: 'desc' } } },
  });
};

const createGoat = async ({ earTagNumber, farmerId }) => {
  return await prisma.goat.create({
    data: { earTagNumber: earTagNumber.trim(), farmerId },
    include: { farmer: true },
  });
};

const updateGoat = async (id, data) => {
  return await prisma.goat.update({ where: { id }, data });
};

const deleteGoat = async (id) => {
  return await prisma.goat.delete({ where: { id } });
};

const getNextEarTagNumber = async () => {
  const goats = await prisma.goat.findMany({ select: { earTagNumber: true } });
  const maxNumber = goats.reduce((max, goat) => {
    const parsed = parseInt(goat.earTagNumber, 10);
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return String(maxNumber + 1);
};

const listGoatsWithoutRecentRecording = async (days) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return await prisma.goat.findMany({
    where: { recordings: { none: { createdAt: { gte: cutoff } } } },
    include: { farmer: true },
    orderBy: { createdAt: 'asc' },
  });
};

module.exports = {
  findOrCreateGoat,
  getGoatsByFarmerId,
  getGoatByEarTagNumber,
  listGoats,
  findGoatById,
  createGoat,
  updateGoat,
  deleteGoat,
  getNextEarTagNumber,
  listGoatsWithoutRecentRecording,
};

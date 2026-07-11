const prisma = require('../lib/prisma');

/**
 * Nomor telinga disimpan sebagai Int di database, tapi bisa masuk sebagai
 * string dari form admin maupun alur WhatsApp — validasi & konversi di sini.
 */
const parseEarTagNumber = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  const parsed = Number(trimmed);

  if (trimmed === '' || trimmed === null || trimmed === undefined || !Number.isInteger(parsed)) {
    throw new Error('Nomor telinga harus berupa angka bulat');
  }

  return parsed;
};

/**
 * Cari kambing berdasarkan nomor telinga.
 * Jika belum ada, buat kambing baru dengan relasi ke peternak.
 */
const findOrCreateGoat = async (earTagNumber, farmerId) => {
  const parsedEarTagNumber = parseEarTagNumber(earTagNumber);

  const existing = await prisma.goat.findUnique({
    where: { earTagNumber: parsedEarTagNumber },
    include: { farmer: true },
  });

  if (existing) return existing;

  return await prisma.goat.create({
    data: {
      earTagNumber: parsedEarTagNumber,
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
    where: { earTagNumber: parseEarTagNumber(earTagNumber) },
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
    data: { earTagNumber: parseEarTagNumber(earTagNumber), farmerId },
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
  const maxNumber = goats.reduce((max, goat) => Math.max(max, goat.earTagNumber), 0);
  return maxNumber + 1;
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
  parseEarTagNumber,
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

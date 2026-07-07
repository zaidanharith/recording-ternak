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

module.exports = {
  findOrCreateGoat,
  getGoatsByFarmerId,
  getGoatByEarTagNumber,
};

const prisma = require('../lib/prisma');

/**
 * Cari kambing berdasarkan nomor telinga.
 * Jika belum ada, buat kambing baru dengan relasi ke peternak.
 */
const findOrCreateKambing = async (nomorTelinga, peternakId) => {
  const cleanNomor = (nomorTelinga || '').trim();

  if (!cleanNomor || cleanNomor === '-') {
    throw new Error('Nomor telinga tidak boleh kosong');
  }

  const existing = await prisma.kambing.findUnique({
    where: { nomor_telinga: cleanNomor },
    include: { peternak: true },
  });

  if (existing) return existing;

  return await prisma.kambing.create({
    data: {
      nomor_telinga: cleanNomor,
      peternakId,
    },
    include: { peternak: true },
  });
};

/**
 * Ambil semua kambing milik satu peternak.
 */
const getKambingByPeternakId = async (peternakId) => {
  return await prisma.kambing.findMany({
    where: { peternakId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Cari kambing berdasarkan nomor telinga saja.
 */
const getKambingByNomorTelinga = async (nomorTelinga) => {
  return await prisma.kambing.findUnique({
    where: { nomor_telinga: nomorTelinga.trim() },
    include: { peternak: true },
  });
};

module.exports = {
  findOrCreateKambing,
  getKambingByPeternakId,
  getKambingByNomorTelinga,
};

const prisma = require('../lib/prisma');

const listPenyebabKematian = async () => {
  return await prisma.penyebabKematian.findMany({ orderBy: { nama: 'asc' } });
};

const findPenyebabKematianById = async (id) => {
  return await prisma.penyebabKematian.findUnique({ where: { id } });
};

/**
 * Dipakai saat menerima sync laporan kematian dari dashboard — penyebab kematian
 * dikorelasikan lewat nama (bukan id, karena tabel referensi ini tidak sync 1:1 by id).
 */
const findOrCreatePenyebabKematianByNama = async (nama) => {
  return await prisma.penyebabKematian.upsert({
    where: { nama },
    update: {},
    create: { nama },
  });
};

module.exports = { listPenyebabKematian, findPenyebabKematianById, findOrCreatePenyebabKematianByNama };

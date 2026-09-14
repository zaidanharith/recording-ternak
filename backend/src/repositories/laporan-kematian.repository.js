const prisma = require('../lib/prisma');

const laporanInclude = {
  goat: { include: { farmer: true } },
  penyebabKematian: true,
};

const listLaporanKematian = async () => {
  return await prisma.laporanKematian.findMany({
    include: laporanInclude,
    orderBy: { tanggalKematian: 'desc' },
  });
};

const findLaporanKematianById = async (id) => {
  return await prisma.laporanKematian.findUnique({ where: { id }, include: laporanInclude });
};

const createLaporanKematian = async ({ goatId, penyebabKematianId, petugasId, tanggalKematian, catatan }) => {
  const [laporan] = await prisma.$transaction([
    prisma.laporanKematian.create({
      data: {
        goatId,
        penyebabKematianId,
        petugasId,
        tanggalKematian: new Date(tanggalKematian),
        catatan,
      },
      include: laporanInclude,
    }),
    prisma.goat.update({ where: { id: goatId }, data: { status: 'MATI' } }),
  ]);
  return laporan;
};

const updateLaporanKematian = async (id, { penyebabKematianId, tanggalKematian, catatan, nomorBeritaAcara }) => {
  try {
    return await prisma.laporanKematian.update({
      where: { id },
      data: {
        penyebabKematianId,
        tanggalKematian: tanggalKematian ? new Date(tanggalKematian) : undefined,
        catatan,
        nomorBeritaAcara,
      },
      include: laporanInclude,
    });
  } catch (error) {
    if (error.code === 'P2025') return null;
    throw error;
  }
};

/**
 * P2025-tolerant: dipakai baik oleh CRUD lokal maupun penerima sync dari dashboard,
 * keduanya harus anggap "sudah tidak ada" sebagai sukses, bukan error.
 */
const deleteLaporanKematianById = async (id) => {
  const laporan = await prisma.laporanKematian.findUnique({ where: { id } });
  if (!laporan) return null;

  await prisma.$transaction([
    prisma.laporanKematian.delete({ where: { id } }),
    prisma.goat.update({ where: { id: laporan.goatId }, data: { status: 'HIDUP' } }),
  ]);
  return laporan;
};

/**
 * Upsert dengan id tetap — dipakai saat menerima sync dari dashboard-kematian-ternak,
 * supaya kedua database punya row laporan dengan id yang sama.
 */
const upsertLaporanKematianById = async (
  id,
  { goatId, penyebabKematianId, petugasId, tanggalKematian, catatan, nomorBeritaAcara },
) => {
  const [laporan] = await prisma.$transaction([
    prisma.laporanKematian.upsert({
      where: { id },
      create: {
        id,
        goatId,
        penyebabKematianId,
        petugasId,
        tanggalKematian: new Date(tanggalKematian),
        catatan,
        nomorBeritaAcara,
      },
      update: {
        penyebabKematianId,
        tanggalKematian: new Date(tanggalKematian),
        catatan,
        nomorBeritaAcara,
      },
      include: laporanInclude,
    }),
    prisma.goat.update({ where: { id: goatId }, data: { status: 'MATI' } }),
  ]);
  return laporan;
};

module.exports = {
  listLaporanKematian,
  findLaporanKematianById,
  createLaporanKematian,
  updateLaporanKematian,
  deleteLaporanKematianById,
  upsertLaporanKematianById,
};

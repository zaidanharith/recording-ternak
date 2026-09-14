const prisma = require('../lib/prisma');

const laporanInclude = {
  goat: { include: { farmer: true } },
};

const listLaporanKelahiran = async () => {
  return await prisma.laporanKelahiran.findMany({
    include: laporanInclude,
    orderBy: { tanggalLahir: 'desc' },
  });
};

const findLaporanKelahiranById = async (id) => {
  return await prisma.laporanKelahiran.findUnique({ where: { id }, include: laporanInclude });
};

const createLaporanKelahiran = async ({ goatId, petugasId, petugasNama, tanggalLahir, catatan }) => {
  return await prisma.laporanKelahiran.create({
    data: {
      goatId,
      petugasId,
      petugasNama,
      tanggalLahir: new Date(tanggalLahir),
      catatan,
    },
    include: laporanInclude,
  });
};

const updateLaporanKelahiran = async (id, { tanggalLahir, catatan, nomorAkta }) => {
  try {
    return await prisma.laporanKelahiran.update({
      where: { id },
      data: {
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : undefined,
        catatan,
        nomorAkta,
      },
      include: laporanInclude,
    });
  } catch (error) {
    if (error.code === 'P2025') return null;
    throw error;
  }
};

const deleteLaporanKelahiranById = async (id) => {
  try {
    return await prisma.laporanKelahiran.delete({ where: { id } });
  } catch (error) {
    if (error.code === 'P2025') return null;
    throw error;
  }
};

/**
 * Upsert dengan id tetap — dipakai saat menerima sync dari dashboard-kematian-ternak.
 */
const upsertLaporanKelahiranById = async (
  id,
  { goatId, petugasId, petugasNama, tanggalLahir, catatan, nomorAkta },
) => {
  return await prisma.laporanKelahiran.upsert({
    where: { id },
    create: {
      id,
      goatId,
      petugasId,
      petugasNama,
      tanggalLahir: new Date(tanggalLahir),
      catatan,
      nomorAkta,
    },
    update: {
      petugasNama,
      tanggalLahir: new Date(tanggalLahir),
      catatan,
      nomorAkta,
    },
    include: laporanInclude,
  });
};

module.exports = {
  listLaporanKelahiran,
  findLaporanKelahiranById,
  createLaporanKelahiran,
  updateLaporanKelahiran,
  deleteLaporanKelahiranById,
  upsertLaporanKelahiranById,
};

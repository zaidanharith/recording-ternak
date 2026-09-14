const goatRepository = require('../repositories/goat.repository');
const laporanKelahiranRepository = require('../repositories/laporan-kelahiran.repository');
const dashboardSyncService = require('./dashboard-sync.service');
const { generateAktaKelahiranDocx, generateAktaKelahiranPdf } = require('./akta-kelahiran.service');

/**
 * Kelahiran selalu buat laporan baru untuk kambing yang sudah ada — beda dengan kematian
 * yang menghalangi laporan kedua untuk kambing yang sama (unique constraint di goatId).
 */
async function createLaporanKelahiran({ goat, jenisKelamin, tanggalLahir, rasRumpun, catatan }, petugas) {
  if (!goat.jenisKelamin || !goat.rasRumpun || !goat.birthDate) {
    await goatRepository.updateGoat(goat.id, {
      jenisKelamin: goat.jenisKelamin || jenisKelamin,
      rasRumpun: goat.rasRumpun || rasRumpun,
      birthDate: goat.birthDate || new Date(tanggalLahir),
    });
  }

  const laporan = await laporanKelahiranRepository.createLaporanKelahiran({
    goatId: goat.id,
    petugasId: petugas.id,
    petugasNama: petugas.name,
    tanggalLahir,
    catatan,
  });

  await dashboardSyncService.pushLaporanKelahiranUpsert(laporan, laporan.goat);

  return laporan;
}

async function getAktaFile(laporanId, format) {
  const laporan = await laporanKelahiranRepository.findLaporanKelahiranById(laporanId);
  if (!laporan) {
    const error = new Error('Laporan kelahiran tidak ditemukan.');
    error.status = 404;
    throw error;
  }

  if (format === 'pdf') {
    const buffer = await generateAktaKelahiranPdf(laporan);
    return {
      buffer,
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="akta-kelahiran-${laporan.goat.earTagNumber}.pdf"`,
    };
  }

  const buffer = generateAktaKelahiranDocx(laporan);
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    contentDisposition: `attachment; filename="akta-kelahiran-${laporan.goat.earTagNumber}.docx"`,
  };
}

async function listLaporanKelahiran() {
  return await laporanKelahiranRepository.listLaporanKelahiran();
}

async function getLaporanKelahiranById(id) {
  return await laporanKelahiranRepository.findLaporanKelahiranById(id);
}

async function updateLaporanKelahiran(id, { tanggalLahir, catatan, nomorAkta }) {
  const laporan = await laporanKelahiranRepository.updateLaporanKelahiran(id, { tanggalLahir, catatan, nomorAkta });
  if (!laporan) return null;

  await dashboardSyncService.pushLaporanKelahiranUpsert(laporan, laporan.goat);
  return laporan;
}

async function deleteLaporanKelahiran(id) {
  const laporan = await laporanKelahiranRepository.deleteLaporanKelahiranById(id);
  if (!laporan) return null;

  await dashboardSyncService.pushLaporanKelahiranDelete(id);
  return laporan;
}

module.exports = {
  createLaporanKelahiran,
  getAktaFile,
  listLaporanKelahiran,
  getLaporanKelahiranById,
  updateLaporanKelahiran,
  deleteLaporanKelahiran,
};

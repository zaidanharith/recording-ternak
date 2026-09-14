const goatRepository = require('../repositories/goat.repository');
const penyebabKematianRepository = require('../repositories/penyebab-kematian.repository');
const laporanKematianRepository = require('../repositories/laporan-kematian.repository');
const dashboardSyncService = require('./dashboard-sync.service');
const { generateBeritaAcaraDocx, generateBeritaAcaraPdf } = require('./berita-acara.service');

async function getPenyebabKematianOptions() {
  return await penyebabKematianRepository.listPenyebabKematian();
}

async function createLaporanKematian({ goat, penyebabKematianId, tanggalKematian, catatan, jenisKelamin, tanggalLahir, rasRumpun }, petugasId) {
  if (goat.status === 'MATI') {
    const error = new Error('Kambing ini sudah dilaporkan mati sebelumnya.');
    error.status = 400;
    throw error;
  }

  const resolvedJenisKelamin = goat.jenisKelamin || jenisKelamin;
  const resolvedTanggalLahir = goat.birthDate || tanggalLahir;

  if (!resolvedJenisKelamin || !resolvedTanggalLahir) {
    const error = new Error(
      'Data kambing (jenis kelamin, tanggal lahir) belum lengkap. Lengkapi data kambing terlebih dahulu sebelum membuat laporan kematian.',
    );
    error.status = 400;
    throw error;
  }

  if (!goat.jenisKelamin || !goat.birthDate || !goat.rasRumpun) {
    await goatRepository.updateGoat(goat.id, {
      jenisKelamin: goat.jenisKelamin || jenisKelamin,
      birthDate: goat.birthDate || new Date(tanggalLahir),
      rasRumpun: goat.rasRumpun || rasRumpun,
    });
  }

  const penyebabKematian = await penyebabKematianRepository.findPenyebabKematianById(penyebabKematianId);
  if (!penyebabKematian) {
    const error = new Error('Penyebab kematian tidak ditemukan.');
    error.status = 400;
    throw error;
  }

  const laporan = await laporanKematianRepository.createLaporanKematian({
    goatId: goat.id,
    penyebabKematianId,
    petugasId,
    tanggalKematian,
    catatan,
  });

  await dashboardSyncService.pushLaporanKematianUpsert(laporan, laporan.goat, penyebabKematian.nama);

  return laporan;
}

async function getBeritaAcaraFile(laporanId, format) {
  const laporan = await laporanKematianRepository.findLaporanKematianById(laporanId);
  if (!laporan) {
    const error = new Error('Laporan kematian tidak ditemukan.');
    error.status = 404;
    throw error;
  }

  if (format === 'pdf') {
    const buffer = await generateBeritaAcaraPdf(laporan);
    return {
      buffer,
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="berita-acara-${laporan.goat.earTagNumber}.pdf"`,
    };
  }

  const buffer = generateBeritaAcaraDocx(laporan);
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    contentDisposition: `attachment; filename="berita-acara-${laporan.goat.earTagNumber}.docx"`,
  };
}

async function listLaporanKematian() {
  return await laporanKematianRepository.listLaporanKematian();
}

async function getLaporanKematianById(id) {
  return await laporanKematianRepository.findLaporanKematianById(id);
}

async function updateLaporanKematian(id, { penyebabKematianId, tanggalKematian, catatan }) {
  const laporan = await laporanKematianRepository.updateLaporanKematian(id, {
    penyebabKematianId,
    tanggalKematian,
    catatan,
  });
  if (!laporan) return null;

  const penyebabKematian =
    laporan.penyebabKematian || (await penyebabKematianRepository.findPenyebabKematianById(laporan.penyebabKematianId));
  await dashboardSyncService.pushLaporanKematianUpsert(laporan, laporan.goat, penyebabKematian.nama);

  return laporan;
}

async function deleteLaporanKematian(id) {
  const laporan = await laporanKematianRepository.deleteLaporanKematianById(id);
  if (!laporan) return null;

  await dashboardSyncService.pushLaporanKematianDelete(id);
  return laporan;
}

module.exports = {
  getPenyebabKematianOptions,
  createLaporanKematian,
  getBeritaAcaraFile,
  listLaporanKematian,
  getLaporanKematianById,
  updateLaporanKematian,
  deleteLaporanKematian,
};

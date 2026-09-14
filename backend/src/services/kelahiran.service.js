const { dashboardFetch } = require('../lib/dashboard-client');

const JENIS_TERNAK_KAMBING = 'Kambing';

async function getJenisTernakKambingId(token) {
  const { payload } = await dashboardFetch('/api/jenis-ternak', { token });
  const jenisTernak = payload.data.jenisTernak.find((item) => item.nama === JENIS_TERNAK_KAMBING);
  if (!jenisTernak) {
    const error = new Error(`Jenis ternak "${JENIS_TERNAK_KAMBING}" tidak ditemukan di dashboard.`);
    error.status = 500;
    throw error;
  }
  return jenisTernak.id;
}

/**
 * Kelahiran selalu registrasi Ternak baru di dashboard (kodeTernak = ear tag kambing) —
 * beda dengan kematian yang upsert Ternak yang sudah ada.
 */
async function createLaporanKelahiran({ goat, jenisKelamin, tanggalLahir, rasRumpun, catatan }, token) {
  const jenisTernakId = await getJenisTernakKambingId(token);
  const { payload } = await dashboardFetch('/api/laporan-kelahiran', {
    method: 'POST',
    token,
    body: {
      peternakId: goat.farmerId,
      jenisTernakId,
      kodeTernak: String(goat.earTagNumber),
      jenisKelamin,
      rasRumpun,
      tanggalLahir,
      catatan,
    },
  });
  return payload.data.laporan;
}

async function getAktaFile(laporanId, format, token) {
  const { payload, response } = await dashboardFetch(
    `/api/laporan-kelahiran/${laporanId}/akta?format=${format === 'pdf' ? 'pdf' : 'docx'}`,
    { token },
  );

  return {
    buffer: Buffer.from(payload),
    contentType: response.headers.get('content-type'),
    contentDisposition: response.headers.get('content-disposition'),
  };
}

/**
 * Daftar laporan kelahiran, dipersempit ke ternak jenis Kambing saja — sama alasan
 * dengan listLaporanKematian di kematian.service.js.
 */
async function listLaporanKelahiran(token) {
  const { payload } = await dashboardFetch('/api/laporan-kelahiran', { token });
  return payload.data.laporanKelahiran.filter((laporan) => laporan.ternak.jenisTernak.nama === JENIS_TERNAK_KAMBING);
}

async function getLaporanKelahiranById(id, token) {
  const { payload } = await dashboardFetch(`/api/laporan-kelahiran/${id}`, { token });
  return payload.data.laporan;
}

async function updateLaporanKelahiran(id, { tanggalLahir, catatan, nomorAkta }, token) {
  const { payload } = await dashboardFetch(`/api/laporan-kelahiran/${id}`, {
    method: 'PATCH',
    token,
    body: { tanggalLahir, catatan, nomorAkta },
  });
  return payload.data.laporan;
}

async function deleteLaporanKelahiran(id, token) {
  await dashboardFetch(`/api/laporan-kelahiran/${id}`, { method: 'DELETE', token });
}

module.exports = {
  createLaporanKelahiran,
  getAktaFile,
  listLaporanKelahiran,
  getLaporanKelahiranById,
  updateLaporanKelahiran,
  deleteLaporanKelahiran,
};

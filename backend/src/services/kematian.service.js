const { dashboardFetch } = require('../lib/dashboard-client');

const JENIS_TERNAK_KAMBING = 'Kambing';

async function getPenyebabKematianOptions(token) {
  const { payload } = await dashboardFetch('/api/penyebab-kematian', { token });
  return payload.data.penyebabKematian;
}

/**
 * Pastikan Ternak (kambing) sudah ada di dashboard-kematian-ternak, lalu kembalikan id-nya.
 * Ini dipanggil setiap kali generate berita acara — dashboard yang melakukan upsert
 * berdasarkan kodeTernak, jadi generate berikutnya untuk kambing yang sama tidak dobel.
 */
async function provisionTernak({ goat, jenisKelamin, tanggalLahir, rasRumpun }, token) {
  const { payload } = await dashboardFetch('/api/ternak/provision', {
    method: 'POST',
    token,
    body: {
      kodeTernak: String(goat.earTagNumber),
      jenisTernakNama: JENIS_TERNAK_KAMBING,
      peternakId: goat.farmerId,
      jenisKelamin,
      tanggalLahir,
      rasRumpun,
    },
  });
  return payload.data.ternak;
}

async function createLaporanKematian({ ternakId, penyebabKematianId, tanggalKematian, catatan }, token) {
  const { payload } = await dashboardFetch('/api/laporan-kematian', {
    method: 'POST',
    token,
    body: { ternakId, penyebabKematianId, tanggalKematian, catatan },
  });
  return payload.data.laporan;
}

async function getBeritaAcaraFile(laporanId, format, token) {
  const { payload, response } = await dashboardFetch(
    `/api/laporan-kematian/${laporanId}/berita-acara?format=${format === 'pdf' ? 'pdf' : 'docx'}`,
    { token },
  );

  return {
    buffer: Buffer.from(payload),
    contentType: response.headers.get('content-type'),
    contentDisposition: response.headers.get('content-disposition'),
  };
}

module.exports = {
  getPenyebabKematianOptions,
  provisionTernak,
  createLaporanKematian,
  getBeritaAcaraFile,
};

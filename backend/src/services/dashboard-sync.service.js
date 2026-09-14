const { dashboardFetch } = require('../lib/dashboard-client');

/**
 * Sinkronisasi Farmer -> Peternak di dashboard-kematian-ternak.
 * Best-effort: kegagalan di-log, tidak membatalkan perubahan lokal
 * (lihat catatan skala kecil di desain integrasi — belum ada retry queue).
 */
async function pushFarmerUpsert(farmer) {
  try {
    await dashboardFetch(`/internal/peternak/${farmer.id}`, {
      method: 'PUT',
      body: {
        nama: farmer.name,
        desa: farmer.desa,
        dusun: farmer.dusun,
        rt: farmer.rt,
        rw: farmer.rw,
        telepon: farmer.whatsappPhone,
      },
    });
  } catch (error) {
    console.error(`[dashboard-sync] Gagal sinkron peternak ${farmer.id} ke dashboard:`, error.message);
  }
}

async function pushFarmerDelete(id) {
  try {
    await dashboardFetch(`/internal/peternak/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error(`[dashboard-sync] Gagal hapus peternak ${id} di dashboard:`, error.message);
  }
}

async function pushLaporanKematianUpsert(laporan, goat, penyebabKematianNama) {
  try {
    await dashboardFetch(`/internal/laporan-kematian/${laporan.id}`, {
      method: 'PUT',
      body: {
        kodeTernak: String(goat.earTagNumber),
        jenisKelamin: goat.jenisKelamin,
        rasRumpun: goat.rasRumpun,
        tanggalLahir: goat.birthDate,
        peternakId: goat.farmerId,
        penyebabKematianNama,
        petugasId: laporan.petugasId,
        tanggalKematian: laporan.tanggalKematian,
        catatan: laporan.catatan,
        nomorBeritaAcara: laporan.nomorBeritaAcara,
      },
    });
  } catch (error) {
    console.error(`[dashboard-sync] Gagal sinkron laporan kematian ${laporan.id} ke dashboard:`, error.message);
  }
}

async function pushLaporanKematianDelete(id) {
  try {
    await dashboardFetch(`/internal/laporan-kematian/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error(`[dashboard-sync] Gagal hapus laporan kematian ${id} di dashboard:`, error.message);
  }
}

async function pushLaporanKelahiranUpsert(laporan, goat) {
  try {
    await dashboardFetch(`/internal/laporan-kelahiran/${laporan.id}`, {
      method: 'PUT',
      body: {
        kodeTernak: String(goat.earTagNumber),
        jenisKelamin: goat.jenisKelamin,
        rasRumpun: goat.rasRumpun,
        peternakId: goat.farmerId,
        petugasId: laporan.petugasId,
        petugasNama: laporan.petugasNama,
        tanggalLahir: laporan.tanggalLahir,
        catatan: laporan.catatan,
        nomorAkta: laporan.nomorAkta,
      },
    });
  } catch (error) {
    console.error(`[dashboard-sync] Gagal sinkron laporan kelahiran ${laporan.id} ke dashboard:`, error.message);
  }
}

async function pushLaporanKelahiranDelete(id) {
  try {
    await dashboardFetch(`/internal/laporan-kelahiran/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error(`[dashboard-sync] Gagal hapus laporan kelahiran ${id} di dashboard:`, error.message);
  }
}

module.exports = {
  pushFarmerUpsert,
  pushFarmerDelete,
  pushLaporanKematianUpsert,
  pushLaporanKematianDelete,
  pushLaporanKelahiranUpsert,
  pushLaporanKelahiranDelete,
};

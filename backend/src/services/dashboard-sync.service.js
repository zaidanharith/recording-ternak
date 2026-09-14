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

module.exports = { pushFarmerUpsert, pushFarmerDelete };

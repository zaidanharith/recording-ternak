const { runFullSync } = require('../services/sync.service');
const { getSyncStatus } = require('../repositories/sync-status.repository');

exports.getStatus = async (req, res) => {
  try {
    const status = await getSyncStatus();
    return res.status(200).json({
      success: true,
      data: { sync: status || { lastSyncAt: null, lastStatus: 'BELUM_PERNAH', lastError: null } },
    });
  } catch (error) {
    console.error('Get Sync Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil status sinkronisasi.',
      error: error.message,
    });
  }
};

exports.retrySync = async (req, res) => {
  try {
    await runFullSync();
    return res.status(200).json({ success: true, message: 'Sinkronisasi ulang berhasil.' });
  } catch (error) {
    console.error('Retry Sync Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Sinkronisasi ulang gagal.',
      error: error.message,
    });
  }
};

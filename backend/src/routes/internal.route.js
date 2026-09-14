const express = require('express');
const router = express.Router();
const internalKeyMiddleware = require('../middlewares/internal-key.middleware');
const farmerRepository = require('../repositories/farmer.repository');

router.use(internalKeyMiddleware);

/**
 * Menerima sinkronisasi Peternak dari dashboard-kematian-ternak.
 * id dipakai sebagai id Farmer juga, supaya row di kedua database berkorespondensi 1:1.
 */
router.put('/farmers/:id', async (req, res) => {
  try {
    const { nama, desa, dusun, rt, rw, telepon } = req.body;

    if (!nama || !telepon) {
      return res.status(400).json({ success: false, message: 'nama dan telepon wajib diisi.' });
    }

    const farmer = await farmerRepository.upsertFarmerById(req.params.id, {
      name: nama,
      desa,
      dusun,
      rt,
      rw,
      whatsappPhone: telepon,
    });

    return res.status(200).json({ success: true, data: { farmer } });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Nomor telepon sudah dipakai peternak lain.' });
    }
    console.error('Internal Upsert Farmer Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal sinkronisasi peternak.', error: error.message });
  }
});

router.delete('/farmers/:id', async (req, res) => {
  try {
    await farmerRepository.deleteFarmer(req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(200).json({ success: true, message: 'Peternak sudah tidak ada.' });
    }
    console.error('Internal Delete Farmer Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus peternak.', error: error.message });
  }
});

module.exports = router;

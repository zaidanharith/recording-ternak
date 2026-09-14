const express = require('express');
const router = express.Router();
const internalKeyMiddleware = require('../middlewares/internal-key.middleware');
const farmerRepository = require('../repositories/farmer.repository');
const goatRepository = require('../repositories/goat.repository');
const penyebabKematianRepository = require('../repositories/penyebab-kematian.repository');
const laporanKematianRepository = require('../repositories/laporan-kematian.repository');
const laporanKelahiranRepository = require('../repositories/laporan-kelahiran.repository');

router.use(internalKeyMiddleware);

/**
 * Isi Goat yang belum diketahui recording-ternak (jenisKelamin/rasRumpun/birthDate) dari
 * data yang dikirim dashboard — tidak menimpa nilai yang sudah diisi lokal.
 */
async function fillGoatDetailsIfMissing(goat, { jenisKelamin, rasRumpun, tanggalLahir }) {
  const patch = {};
  if (!goat.jenisKelamin && jenisKelamin) patch.jenisKelamin = jenisKelamin;
  if (!goat.rasRumpun && rasRumpun) patch.rasRumpun = rasRumpun;
  if (!goat.birthDate && tanggalLahir) patch.birthDate = new Date(tanggalLahir);
  if (Object.keys(patch).length > 0) {
    await goatRepository.updateGoat(goat.id, patch);
  }
}

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

/**
 * Menerima sinkronisasi laporan kematian dari dashboard-kematian-ternak. Kambing dikorelasikan
 * lewat kodeTernak (= ear tag), bukan id — Ternak (dashboard) dan Goat (di sini) punya id space
 * yang beda. Kalau kambingnya belum ada di recording-ternak, ini best-effort skip, bukan error.
 */
router.put('/laporan-kematian/:id', async (req, res) => {
  try {
    const { kodeTernak, jenisKelamin, rasRumpun, tanggalLahir, penyebabKematianNama, petugasId, tanggalKematian, catatan, nomorBeritaAcara } =
      req.body;

    if (!kodeTernak || !penyebabKematianNama || !petugasId || !tanggalKematian) {
      return res.status(400).json({ success: false, message: 'Data laporan kematian tidak lengkap.' });
    }

    const goat = await goatRepository.findGoatByEarTagNumberOrNull(kodeTernak);
    if (!goat) {
      return res.status(200).json({ success: true, message: 'Kambing tidak ditemukan di recording-ternak, dilewati.' });
    }

    await fillGoatDetailsIfMissing(goat, { jenisKelamin, rasRumpun, tanggalLahir });
    const penyebabKematian = await penyebabKematianRepository.findOrCreatePenyebabKematianByNama(penyebabKematianNama);

    const laporan = await laporanKematianRepository.upsertLaporanKematianById(req.params.id, {
      goatId: goat.id,
      penyebabKematianId: penyebabKematian.id,
      petugasId,
      tanggalKematian,
      catatan,
      nomorBeritaAcara,
    });

    return res.status(200).json({ success: true, data: { laporan } });
  } catch (error) {
    console.error('Internal Upsert Laporan Kematian Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal sinkronisasi laporan kematian.', error: error.message });
  }
});

router.delete('/laporan-kematian/:id', async (req, res) => {
  try {
    await laporanKematianRepository.deleteLaporanKematianById(req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Internal Delete Laporan Kematian Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus laporan kematian.', error: error.message });
  }
});

router.put('/laporan-kelahiran/:id', async (req, res) => {
  try {
    const { kodeTernak, jenisKelamin, rasRumpun, petugasId, petugasNama, tanggalLahir, catatan, nomorAkta } = req.body;

    if (!kodeTernak || !petugasId || !petugasNama || !tanggalLahir) {
      return res.status(400).json({ success: false, message: 'Data laporan kelahiran tidak lengkap.' });
    }

    const goat = await goatRepository.findGoatByEarTagNumberOrNull(kodeTernak);
    if (!goat) {
      return res.status(200).json({ success: true, message: 'Kambing tidak ditemukan di recording-ternak, dilewati.' });
    }

    await fillGoatDetailsIfMissing(goat, { jenisKelamin, rasRumpun, tanggalLahir });

    const laporan = await laporanKelahiranRepository.upsertLaporanKelahiranById(req.params.id, {
      goatId: goat.id,
      petugasId,
      petugasNama,
      tanggalLahir,
      catatan,
      nomorAkta,
    });

    return res.status(200).json({ success: true, data: { laporan } });
  } catch (error) {
    console.error('Internal Upsert Laporan Kelahiran Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal sinkronisasi laporan kelahiran.', error: error.message });
  }
});

router.delete('/laporan-kelahiran/:id', async (req, res) => {
  try {
    await laporanKelahiranRepository.deleteLaporanKelahiranById(req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Internal Delete Laporan Kelahiran Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus laporan kelahiran.', error: error.message });
  }
});

module.exports = router;

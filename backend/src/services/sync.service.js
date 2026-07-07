const prisma = require('../lib/prisma');
const { readSheetRowCount, syncAllFromDB } = require('./sheets.service');
const { getAllDataForQuery } = require('../repositories/recording.repository');
const config = require('../config');

/**
 * Verifikasi konsistensi DB vs Spreadsheet.
 * Bandingkan jumlah baris di DB vs Sheets untuk masing-masing entitas.
 * Jika ada beda → jalankan full sync otomatis dari DB ke Sheets.
 *
 * Dipanggil secara async (non-blocking) setelah setiap saveReport.
 */
const verifySheetsConsistency = async () => {
  try {
    const [dbRecording, dbKambing, dbPeternak] = await Promise.all([
      prisma.recording.count(),
      prisma.goat.count(),
      prisma.farmer.count(),
    ]);

    const [sheetsRecording, sheetsKambing, sheetsPeternak] = await Promise.all([
      readSheetRowCount(config.sheets.sheetNames.recording),
      readSheetRowCount(config.sheets.sheetNames.kambing),
      readSheetRowCount(config.sheets.sheetNames.peternak),
    ]);

    const isConsistent =
      dbRecording === sheetsRecording &&
      dbKambing === sheetsKambing &&
      dbPeternak === sheetsPeternak;

    if (!isConsistent) {
      console.warn(
        `⚠️ Ketidaksesuaian data terdeteksi!\n` +
        `  Recording: DB=${dbRecording} vs Sheets=${sheetsRecording}\n` +
        `  Kambing:   DB=${dbKambing} vs Sheets=${sheetsKambing}\n` +
        `  Peternak:  DB=${dbPeternak} vs Sheets=${sheetsPeternak}\n` +
        `  → Menjalankan full sync...`
      );
      await runFullSync();
    } else {
      console.log(`✅ Data konsisten: ${dbRecording} recording, ${dbKambing} kambing, ${dbPeternak} peternak`);
    }
  } catch (err) {
    console.error('❌ Gagal verifikasi konsistensi:', err.message);
  }
};

/**
 * Ambil semua data dari DB dan tulis ulang seluruh Spreadsheet.
 * Ini adalah operasi berat — gunakan hanya jika benar-benar diperlukan.
 */
const runFullSync = async () => {
  try {
    console.log('🔄 Memulai full sync DB → Sheets...');
    const allData = await getAllDataForQuery();
    await syncAllFromDB(allData);
  } catch (err) {
    console.error('❌ Full sync gagal:', err.message);
    throw err;
  }
};

module.exports = { verifySheetsConsistency, runFullSync };

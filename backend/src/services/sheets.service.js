const { google } = require('googleapis');
const path = require('path');
const config = require('../config');

// ─── Auth ─────────────────────────────────────────────────────────────────────

const getAuthClient = () => {
  if (process.env.GOOGLE_CREDENTIALS) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), config.sheets.credentialsPath),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const getSheetsClient = () => google.sheets({ version: 'v4', auth: getAuthClient() });

// ─── Pastikan header baris pertama sudah ada ──────────────────────────────────

const ensureHeaderRow = async (sheets, sheetName, columns) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  const existingHeader = response.data.values?.[0];
  if (existingHeader && existingHeader.length > 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    resource: { values: [columns.map((c) => c.label)] },
  });
};

// ─── Helper append generik ────────────────────────────────────────────────────

const appendToSheet = async (sheetName, columns, data) => {
  const sheets = getSheetsClient();
  await ensureHeaderRow(sheets, sheetName, columns);

  const row = columns.map((col) => data[col.key] ?? '-');

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
};

// ─── Update satu baris di sheet berdasarkan nilai kolom pertama (key) ─────────

const updateRowByKey = async (sheetName, columns, keyValue, data) => {
  const sheets = getSheetsClient();
  const { spreadsheetId } = config.sheets;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });

  const rows = response.data.values || [];
  // Baris 0 adalah header, data mulai dari baris 1 (index 1 → row 2)
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === keyValue);

  if (rowIndex === -1) {
    // Belum ada → append baru
    return appendToSheet(sheetName, columns, data);
  }

  const rowNumber = rowIndex + 1; // 1-indexed di Sheets API
  const row = columns.map((col) => data[col.key] ?? '-');

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
};

// ─── Fungsi publik per sheet ──────────────────────────────────────────────────

/**
 * Tambah baris ke sheet Recording.
 */
const appendRecording = (data) =>
  appendToSheet(
    config.sheets.sheetNames.recording,
    config.dataSchema.recording,
    data
  );

/**
 * Tambah atau update baris di sheet Kambing (key: nomor_telinga).
 * Update jika kambing sudah ada agar tidak duplikat.
 */
const upsertKambing = (data) =>
  updateRowByKey(
    config.sheets.sheetNames.kambing,
    config.dataSchema.kambing,
    data.nomor_telinga,
    data
  );

/**
 * Tambah atau update baris di sheet Peternak (key: nomor WhatsApp).
 * Update jika peternak sudah ada agar tidak duplikat.
 */
const upsertPeternak = (data) =>
  updateRowByKey(
    config.sheets.sheetNames.peternak,
    config.dataSchema.peternak,
    data.whatsapp_phone,
    data
  );

/**
 * Baca jumlah baris data di sebuah sheet (tidak termasuk header).
 */
const readSheetRowCount = async (sheetName) => {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  const rows = response.data.values || [];
  return Math.max(0, rows.length - 1); // kurangi 1 untuk header
};

/**
 * Hapus semua baris data di sebuah sheet (pertahankan header baris pertama).
 */
const clearSheetData = async (sheets, sheetName) => {
  // Ambil jumlah baris dulu
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  const totalRows = (response.data.values || []).length;
  if (totalRows <= 1) return; // hanya header atau kosong

  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.sheets.spreadsheetId,
    range: `${sheetName}!A2:Z${totalRows + 10}`,
  });
};

/**
 * Full sync: tulis ulang semua data dari DB ke Spreadsheet.
 * Dipanggil saat ada ketidaksesuaian data.
 * Parameter allData: output dari getAllDataForQuery() (peternak + kambing + recordings).
 */
const syncAllFromDB = async (allPeternak) => {
  const sheets = getSheetsClient();
  const { spreadsheetId, sheetNames } = config.sheets;

  // Kumpulkan semua baris untuk masing-masing sheet
  const recordingRows = [];
  const kambingRows = [];
  const peternakRows = [];

  const peternakFieldMap = {
    nama: (p) => p.name,
    desa: (p) => p.desa,
    dusun: (p) => p.dusun,
    rt: (p) => p.rt,
    rw: (p) => p.rw,
    whatsapp_phone: (p) => p.whatsappPhone,
  };

  const formatDateForSheet = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
  };

  const SOLD_LABELS = { YA: 'Ya', TIDAK: 'Tidak' };
  const CONDITION_LABELS = { SEHAT: 'Sehat', SAKIT: 'Sakit' };

  const recordingFieldMap = {
    tanggal_kawin: (r) => formatDateForSheet(r.matingDate),
    tanggal_beranak: (r) => formatDateForSheet(r.birthDate),
    jumlah_anak_jantan: (r) => r.maleKidCount,
    jumlah_anak_betina: (r) => r.femaleKidCount,
    perkawinan_ke: (r) => r.matingNumber,
    target_penjualan: (r) => r.saleTarget,
    terjual: (r) => SOLD_LABELS[r.sold] ?? '-',
    kondisi: (r) => CONDITION_LABELS[r.condition] ?? '-',
    catatan: (r) => r.notes,
  };

  for (const p of allPeternak) {
    const terdaftar = new Date(p.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

    peternakRows.push(
      config.dataSchema.peternak.map((col) => {
        if (col.key === 'createdAt') return terdaftar;
        return peternakFieldMap[col.key]?.(p) ?? '-';
      })
    );

    for (const k of p.goats) {
      const kTerdaftar = new Date(k.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
      kambingRows.push(
        config.dataSchema.kambing.map((col) => {
          if (col.key === 'nomor_telinga') return k.earTagNumber;
          if (col.key === 'nama_peternak') return p.name;
          if (col.key === 'whatsapp_phone') return p.whatsappPhone;
          if (col.key === 'createdAt') return kTerdaftar;
          return '-';
        })
      );

      for (const r of k.recordings) {
        const rTimestamp = new Date(r.createdAt).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        recordingRows.push(
          config.dataSchema.recording.map((col) => {
            if (col.key === 'timestamp') return rTimestamp;
            if (col.key === 'nomor_telinga') return k.earTagNumber;
            if (col.key === 'nama_peternak') return p.name;
            return recordingFieldMap[col.key]?.(r) ?? '-';
          })
        );
      }
    }
  }

  // Bersihkan data lama (pertahankan header) + tulis data baru
  await Promise.all([
    (async () => {
      await clearSheetData(sheets, sheetNames.recording);
      if (recordingRows.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetNames.recording}!A2`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: recordingRows },
        });
      }
    })(),
    (async () => {
      await clearSheetData(sheets, sheetNames.kambing);
      if (kambingRows.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetNames.kambing}!A2`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: kambingRows },
        });
      }
    })(),
    (async () => {
      await clearSheetData(sheets, sheetNames.peternak);
      if (peternakRows.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetNames.peternak}!A2`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: peternakRows },
        });
      }
    })(),
  ]);

  console.log(`✅ Full sync selesai: ${recordingRows.length} recording, ${kambingRows.length} kambing, ${peternakRows.length} peternak`);
};

module.exports = { appendRecording, upsertKambing, upsertPeternak, readSheetRowCount, syncAllFromDB };


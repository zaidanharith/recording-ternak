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

module.exports = { appendRecording, upsertKambing, upsertPeternak };

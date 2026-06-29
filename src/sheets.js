const { google } = require('googleapis');
const path = require('path');
const config = require('./config');

const getAuthClient = () => {
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, '..', config.sheets.credentialsPath),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const ensureHeaderRow = async (sheets, spreadsheetId, sheetName) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  const existingHeader = response.data.values?.[0];
  if (existingHeader && existingHeader.length > 0) return;

  const headers = config.dataSchema.columns.map((col) => col.label);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    resource: { values: [headers] },
  });
};

const appendRow = async (data) => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, sheetName } = config.sheets;

  await ensureHeaderRow(sheets, spreadsheetId, sheetName);

  const row = config.dataSchema.columns.map((col) => data[col.key] ?? '-');

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
};

module.exports = { appendRow };

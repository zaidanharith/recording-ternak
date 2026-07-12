const ExcelJS = require('exceljs');
const {
  formatDateId,
  buildExcelBuffer,
  buildPdfBuffer,
  sendExportFile,
} = require('../export.service');

describe('formatDateId', () => {
  it('returns "-" for null/undefined/empty', () => {
    expect(formatDateId(null)).toBe('-');
    expect(formatDateId(undefined)).toBe('-');
    expect(formatDateId('')).toBe('-');
  });

  it('formats a date string in id-ID locale', () => {
    expect(formatDateId('2026-07-11T00:00:00.000Z')).toBe(
      new Date('2026-07-11T00:00:00.000Z').toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
    );
  });
});

describe('buildExcelBuffer', () => {
  it('produces a valid xlsx buffer with header and data rows', async () => {
    const buffer = await buildExcelBuffer({
      sheetName: 'Recording',
      columns: [
        { header: 'Nama', key: 'name', width: 20 },
        { header: 'Umur', key: 'age', width: 10 },
      ],
      rows: [{ name: 'Budi', age: 30 }],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Recording');
    expect(sheet.getRow(1).getCell(1).value).toBe('Nama');
    expect(sheet.getRow(2).getCell(1).value).toBe('Budi');
    expect(sheet.getRow(2).getCell(2).value).toBe(30);
  });
});

describe('buildPdfBuffer', () => {
  it('produces a non-empty PDF buffer', async () => {
    const buffer = await buildPdfBuffer({
      title: 'Laporan Test',
      columns: [{ header: 'Nama', key: 'name' }],
      rows: [{ name: 'Budi' }],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('paginates onto a new page when rows overflow', async () => {
    const rows = Array.from({ length: 80 }, (_, index) => ({ name: `Kambing ${index}` }));
    const buffer = await buildPdfBuffer({
      title: 'Laporan Panjang',
      columns: [{ header: 'Nama', key: 'name' }],
      rows,
    });

    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});

describe('sendExportFile', () => {
  const buildRes = () => ({
    setHeader: jest.fn(),
    send: jest.fn(),
  });

  it('sends an xlsx file with correct headers', async () => {
    const res = buildRes();
    await sendExportFile(res, {
      format: 'xlsx',
      resourceName: 'recording',
      title: 'Laporan Recording',
      columns: [{ header: 'Nama', key: 'name' }],
      rows: [{ name: 'Budi' }],
    });

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('recording-')
    );
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('sends a pdf file with correct headers', async () => {
    const res = buildRes();
    await sendExportFile(res, {
      format: 'pdf',
      resourceName: 'recording',
      title: 'Laporan Recording',
      columns: [{ header: 'Nama', key: 'name' }],
      rows: [{ name: 'Budi' }],
    });

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('recording-')
    );
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });
});

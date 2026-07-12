const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const LOGO_PATH = path.join(__dirname, '../assets/logo-bumdes.png');

const formatDateId = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
};

const buildExcelBuffer = async ({ sheetName, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || Math.max(column.header.length + 2, 12),
  }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => {
    const normalizedRow = {};
    Object.keys(row).forEach((key) => {
      normalizedRow[key] = row[key] ?? '-';
    });
    sheet.addRow(normalizedRow);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildPdfBuffer = ({ title, columns, rows }) => {
  return new Promise((resolve, reject) => {
    const isLandscape = columns.length > 6;
    const doc = new PDFDocument({
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      margin: 40,
    });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const startX = 40;
    const usableWidth = doc.page.width - startX * 2;
    const colWidth = usableWidth / columns.length;
    const rowHeight = 20;
    const bottomMargin = 60;

    const drawHeader = () => {
      let y = 40;
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, startX, y, { width: 45 });
      }
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(title, startX + 55, y, { width: usableWidth - 55 });
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Diekspor pada ${formatDateId(new Date())}`, startX + 55, y + 20, {
          width: usableWidth - 55,
        });
      doc.fillColor('#000000');
      return y + 65;
    };

    const drawRow = (y, values, isHeader) => {
      doc.fontSize(9).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
      values.forEach((value, index) => {
        doc.text(String(value ?? '-'), startX + index * colWidth, y, {
          width: colWidth,
          ellipsis: true,
          lineBreak: false,
        });
      });
    };

    const drawColumnHeaderRow = (headerY) => {
      drawRow(headerY, columns.map((column) => column.header), true);
      const separatorY = headerY + rowHeight - 5;
      doc
        .moveTo(startX, separatorY)
        .lineTo(doc.page.width - startX, separatorY)
        .strokeColor('#cccccc')
        .stroke();
      return separatorY + 8;
    };

    let y = drawHeader();
    y = drawColumnHeaderRow(y);

    rows.forEach((row) => {
      if (y > doc.page.height - bottomMargin) {
        doc.addPage();
        y = drawColumnHeaderRow(40);
      }
      drawRow(y, columns.map((column) => row[column.key]), false);
      y += rowHeight;
    });

    doc.end();
  });
};

const sendExportFile = async (res, { format, resourceName, title, columns, rows }) => {
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (format === 'xlsx') {
    const buffer = await buildExcelBuffer({ sheetName: title, columns, rows });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${resourceName}-${dateSuffix}.xlsx"`);
    return res.send(buffer);
  }

  const buffer = await buildPdfBuffer({ title, columns, rows });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${resourceName}-${dateSuffix}.pdf"`);
  return res.send(buffer);
};

module.exports = {
  formatDateId,
  buildExcelBuffer,
  buildPdfBuffer,
  sendExportFile,
};

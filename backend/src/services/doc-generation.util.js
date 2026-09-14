const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const PDFDocument = require('pdfkit');

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function renderDocx(templatePath, notFoundMessage, data) {
  if (!fs.existsSync(templatePath)) {
    const error = new Error(notFoundMessage);
    error.code = 'TEMPLATE_NOT_FOUND';
    throw error;
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render(data);

  return doc.getZip().generate({ type: 'nodebuffer' });
}

function generatePdfBuffer(drawContent) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawContent(doc);

    doc.end();
  });
}

function drawSignatureBlock(doc, data) {
  doc.text(`Besuki, ${data.tanggal_dibuat_lengkap} ${data.tahun_dibuat}`, { align: 'right' });
  doc.moveDown(3);

  const startY = doc.y;
  doc.text('Pengelola Ternak', 56, startY, { width: 240, align: 'center' });
  doc.text('Ketua Unit Ketahanan Pangan', 300, startY, { width: 240, align: 'center' });
  doc.moveDown(3);
  doc.text('________________________', 56, doc.y, { width: 240, align: 'center' });
  doc.text('MUSANI', 300, doc.y - doc.currentLineHeight(), { width: 240, align: 'center' });

  doc.moveDown(3);
  doc.text('Mengetahui,', { align: 'center' });
  doc.text('Direktur BUMDesa Sumber Abadi Desa Besuki', { align: 'center' });
  doc.moveDown(2);
  doc.font('Times-Bold').text('SUWITO, S.Pd', { align: 'center' });
}

module.exports = {
  NAMA_HARI,
  NAMA_BULAN,
  BULAN_ROMAWI,
  renderDocx,
  generatePdfBuffer,
  drawSignatureBlock,
};

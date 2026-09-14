const path = require('path');
const {
  NAMA_HARI,
  NAMA_BULAN,
  BULAN_ROMAWI,
  renderDocx,
  generatePdfBuffer,
  drawSignatureBlock,
} = require('./doc-generation.util');

function getTemplatePath() {
  return path.join(
    __dirname,
    '..',
    'templates',
    process.env.BERITA_ACARA_TEMPLATE_NAME || 'berita-acara-kematian.docx',
  );
}

function hitungUmur(tanggalLahir, tanggalKematian) {
  let bulan =
    (tanggalKematian.getFullYear() - tanggalLahir.getFullYear()) * 12 +
    (tanggalKematian.getMonth() - tanggalLahir.getMonth());

  if (tanggalKematian.getDate() < tanggalLahir.getDate()) {
    bulan -= 1;
  }

  const tahun = Math.floor(bulan / 12);
  const sisaBulan = bulan % 12;

  return { tahun, bulan: sisaBulan };
}

function buildBeritaAcaraData(laporan) {
  const tanggalLahir = new Date(laporan.goat.birthDate);
  const tanggalKematian = new Date(laporan.tanggalKematian);
  const tanggalDibuat = new Date(laporan.createdAt);
  const umur = hitungUmur(tanggalLahir, tanggalKematian);

  return {
    nomor_urut: laporan.nomorBeritaAcara || '______________',
    bulan_romawi: BULAN_ROMAWI[tanggalDibuat.getMonth()],
    tahun_dibuat: String(tanggalDibuat.getFullYear()),
    hari_dibuat: NAMA_HARI[tanggalDibuat.getDay()],
    tanggal_dibuat_angka: String(tanggalDibuat.getDate()),
    bulan_dibuat: NAMA_BULAN[tanggalDibuat.getMonth()],
    tanggal_dibuat_lengkap: `${tanggalDibuat.getDate()} ${NAMA_BULAN[tanggalDibuat.getMonth()]}`,
    nama_peternak: laporan.goat.farmer.name,
    alamat_peternak: `Desa ${laporan.goat.farmer.desa}, Dusun ${laporan.goat.farmer.dusun} RT ${laporan.goat.farmer.rt}/RW ${laporan.goat.farmer.rw}`,
    jenis_ternak: 'Kambing',
    kode_ternak: String(laporan.goat.earTagNumber),
    jenis_kelamin_ternak: laporan.goat.jenisKelamin === 'JANTAN' ? 'Jantan' : 'Betina',
    ras_rumpun: laporan.goat.rasRumpun || '-',
    umur_ternak: `${umur.tahun} tahun ${umur.bulan} bulan`,
    penyebab_kematian: laporan.penyebabKematian.nama.toLowerCase(),
    tanggal_kematian_angka: String(tanggalKematian.getDate()),
    bulan_kematian: NAMA_BULAN[tanggalKematian.getMonth()],
    tahun_kematian: String(tanggalKematian.getFullYear()),
  };
}

function generateBeritaAcaraDocx(laporan) {
  const templatePath = getTemplatePath();
  const data = buildBeritaAcaraData(laporan);

  return renderDocx(
    templatePath,
    `Template berita acara tidak ditemukan di ${templatePath}. Letakkan file .docx template di folder src/templates.`,
    data,
  );
}

function generateBeritaAcaraPdf(laporan) {
  const data = buildBeritaAcaraData(laporan);

  return generatePdfBuffer((doc) => {
    doc.font('Times-Bold').fontSize(14).text('BERITA ACARA KEMATIAN TERNAK', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .font('Times-Italic')
      .fontSize(11)
      .text(`Nomor : ${data.nomor_urut}/BUMDES-KETAPANG/${data.bulan_romawi}/${data.tahun_dibuat}`, {
        align: 'center',
      });
    doc.moveDown(1);

    doc.font('Times-Roman').fontSize(11);
    doc.text(
      `Pada hari ini ${data.hari_dibuat}, tanggal ${data.tanggal_dibuat_angka} bulan ${data.bulan_dibuat} tahun ${data.tahun_dibuat}, yang bertanda tangan di bawah ini menerangkan bahwa ternak ${data.jenis_ternak} BUMDesa Sumber Abadi Unit Ketahanan Pangan Desa Besuki yang dikelola oleh :`,
      { align: 'justify' },
    );
    doc.moveDown(1);

    doc.text(`Nama Peternak : ${data.nama_peternak}`);
    doc.text(`Alamat : ${data.alamat_peternak}`);
    doc.moveDown(1);

    doc.text('Dengan sidik ternak sebagai berikut :');
    doc.moveDown(0.5);
    doc.list([
      `Jenis / Nomor Ternak : ${data.jenis_ternak} / ${data.kode_ternak}`,
      `Kelamin : ${data.jenis_kelamin_ternak}`,
      `Ras/Rumpun : ${data.ras_rumpun}`,
      `Umur saat kejadian : ${data.umur_ternak}`,
    ]);
    doc.moveDown(1);

    doc.text(
      `Bahwa ternak tersebut diatas telah mati karena ${data.penyebab_kematian} pada tanggal ${data.tanggal_kematian_angka} bulan ${data.bulan_kematian} tahun ${data.tahun_kematian}.`,
      { align: 'justify' },
    );
    doc.moveDown(1);

    doc.text(
      'Demikian Berita Acara ini dibuat dengan sebenar - benarnya untuk dapat dipergunakan sebagaimana mestinya.',
      { align: 'justify' },
    );
    doc.moveDown(2);

    drawSignatureBlock(doc, data);
  });
}

module.exports = { generateBeritaAcaraDocx, generateBeritaAcaraPdf, buildBeritaAcaraData, hitungUmur };

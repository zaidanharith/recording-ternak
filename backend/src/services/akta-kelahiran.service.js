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
    process.env.AKTA_KELAHIRAN_TEMPLATE_NAME || 'akta-kelahiran.docx',
  );
}

function buildAktaKelahiranData(laporan) {
  const tanggalLahir = new Date(laporan.tanggalLahir);
  const tanggalDibuat = new Date(laporan.createdAt);

  return {
    nomor_urut: laporan.nomorAkta || '______________',
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
    tanggal_lahir_angka: String(tanggalLahir.getDate()),
    bulan_lahir: NAMA_BULAN[tanggalLahir.getMonth()],
    tahun_lahir: String(tanggalLahir.getFullYear()),
    petugas_pencatat: laporan.petugasNama,
    catatan: laporan.catatan || '-',
  };
}

function generateAktaKelahiranDocx(laporan) {
  const templatePath = getTemplatePath();
  const data = buildAktaKelahiranData(laporan);

  return renderDocx(
    templatePath,
    `Template akta kelahiran tidak ditemukan di ${templatePath}. Letakkan file .docx template di folder src/templates.`,
    data,
  );
}

function generateAktaKelahiranPdf(laporan) {
  const data = buildAktaKelahiranData(laporan);

  return generatePdfBuffer((doc) => {
    doc.font('Times-Bold').fontSize(14).text('AKTA KELAHIRAN TERNAK', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .font('Times-Italic')
      .fontSize(11)
      .text(`Nomor : ${data.nomor_urut}/AK-LH/BUMDES-KETAPANG/${data.bulan_romawi}/${data.tahun_dibuat}`, {
        align: 'center',
      });
    doc.moveDown(1);

    doc.font('Times-Roman').fontSize(11);
    doc.text(
      `Pada hari ini ${data.hari_dibuat}, tanggal ${data.tanggal_dibuat_angka} bulan ${data.bulan_dibuat} tahun ${data.tahun_dibuat}, yang bertanda tangan di bawah ini menerangkan bahwa telah lahir ternak ${data.jenis_ternak} BUMDesa Sumber Abadi Unit Ketahanan Pangan Desa Besuki yang dikelola oleh :`,
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
    ]);
    doc.moveDown(1);

    doc.text(
      `Bahwa ternak tersebut diatas lahir pada tanggal ${data.tanggal_lahir_angka} bulan ${data.bulan_lahir} tahun ${data.tahun_lahir}, dicatat oleh petugas ${data.petugas_pencatat}.`,
      { align: 'justify' },
    );
    doc.moveDown(1);

    doc.text(
      'Demikian Akta Kelahiran ini dibuat dengan sebenar - benarnya untuk dapat dipergunakan sebagaimana mestinya.',
      { align: 'justify' },
    );
    doc.moveDown(2);

    drawSignatureBlock(doc, data);
  });
}

module.exports = { generateAktaKelahiranDocx, generateAktaKelahiranPdf, buildAktaKelahiranData };

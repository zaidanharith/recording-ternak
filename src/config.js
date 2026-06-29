require('dotenv').config();

const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
  },

  sheets: {
    spreadsheetId: process.env.SPREADSHEET_ID,
    sheetName: process.env.SHEET_NAME || 'Recording Ternak',
    credentialsPath: './google-credentials.json',
  },

  whatsapp: {
    chromePath: process.env.CHROME_PATH,
  },

  dataSchema: {
    columns: [
      { key: 'timestamp', label: 'Timestamp', description: 'Tanggal dan waktu laporan diterima (format: DD/MM/YYYY HH:mm)' },
      { key: 'pengirim', label: 'Pengirim', description: 'Nama atau nomor WhatsApp pengirim laporan' },
      { key: 'nama_pemilik', label: 'Nama Pemilik', description: 'Nama peternak atau pemilik hewan' },
      { key: 'jenis_ternak', label: 'Jenis Ternak', description: 'Jenis hewan ternak, misal: sapi, kambing, domba, kerbau, ayam, itik' },
      { key: 'ras_breed', label: 'Ras/Breed', description: 'Ras atau jenis bangsa ternak, misal: Limosin, Etawa, Merino. Isi dengan "-" jika tidak disebutkan' },
      { key: 'id_hewan', label: 'ID Hewan', description: 'Nomor eartag, warna tindik, atau nama hewan. Isi dengan "-" jika tidak disebutkan' },
      { key: 'jenis_kelamin', label: 'Jenis Kelamin', description: 'Jantan, Betina, atau "-" jika tidak disebutkan' },
      { key: 'kondisi_kesehatan', label: 'Kondisi Kesehatan', description: 'Status kondisi hewan: Sehat, Sakit, Melahirkan, Mati, atau deskripsi gejala klinis yang disebutkan' },
      { key: 'tindakan', label: 'Tindakan', description: 'Tindakan medis atau penanganan yang dilakukan, misal: vaksinasi, pemberian antibiotik, vitamin. Isi dengan "-" jika tidak ada' },
      { key: 'keterangan', label: 'Keterangan', description: 'Catatan tambahan lain yang tidak masuk kategori di atas. Isi dengan "-" jika tidak ada' },
    ],
  },
};

module.exports = config;

require('dotenv').config();

const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
  },

  sheets: {
    spreadsheetId: process.env.SPREADSHEET_ID,
    sheetName: process.env.SHEET_NAME || 'Recording Kambing',
    credentialsPath: './google-credentials.json',
  },

  whatsapp: {
    accessToken: process.env.WA_ACCESS_TOKEN,
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
    verifyToken: process.env.WA_VERIFY_TOKEN,
  },

  dataSchema: {
    columns: [
      { key: 'timestamp',          label: 'Timestamp',            description: 'Tanggal dan waktu laporan diterima sistem secara otomatis (format: DD/MM/YYYY HH:mm). Jangan ekstrak dari pesan.' },
      { key: 'pengirim',           label: 'Pengirim',             description: 'Nama atau nomor WhatsApp pengirim laporan, diisi otomatis oleh sistem. Jangan ekstrak dari pesan.' },
      { key: 'nama_peternak',      label: 'Nama Peternak',        description: 'Nama lengkap peternak pemilik kambing yang melaporkan.' },
      { key: 'nomor_telinga',      label: 'Nomor Telinga/Ternak', description: 'ID atau nomor tag telinga kambing yang dilaporkan. Isi dengan "-" jika tidak disebutkan.' },
      { key: 'alamat',             label: 'Alamat',               description: 'Alamat lengkap atau lokasi kandang peternak. Isi dengan "-" jika tidak disebutkan.' },
      { key: 'tanggal_kawin',      label: 'Tanggal Kawin',        description: 'Tanggal perkawinan kambing betina. Pertahankan format tanggal seperti yang ditulis peternak (misal: 12 Januari 2025, 12/01/2025). Isi dengan "-" jika tidak disebutkan.' },
      { key: 'tanggal_beranak',    label: 'Tanggal Beranak',      description: 'Tanggal melahirkan/beranak kambing. Pertahankan format tanggal seperti yang ditulis peternak. Isi dengan "-" jika tidak disebutkan.' },
      { key: 'jumlah_anak_jantan', label: 'Jumlah Anak Jantan',   description: 'Jumlah anak kambing yang lahir berjenis kelamin jantan. Isi angka 0 jika disebutkan tidak ada, atau "-" jika tidak disebutkan sama sekali.' },
      { key: 'jumlah_anak_betina', label: 'Jumlah Anak Betina',   description: 'Jumlah anak kambing yang lahir berjenis kelamin betina. Isi angka 0 jika disebutkan tidak ada, atau "-" jika tidak disebutkan sama sekali.' },
      { key: 'perkawinan_ke',      label: 'Perkawinan Ke',        description: 'Urutan perkawinan (parity), misal: 1, 2, 3 dst. Isi dengan "-" jika tidak disebutkan.' },
      { key: 'target_penjualan',   label: 'Target Penjualan',     description: 'Target tanggal atau harga penjualan kambing sebagaimana ditulis peternak. Isi dengan "-" jika tidak disebutkan.' },
      { key: 'terjual',            label: 'Terjual',              description: 'Status penjualan kambing: "Ya", "Belum", harga terjual, atau keterangan penjualan sebagaimana ditulis. Isi dengan "-" jika tidak disebutkan.' },
      { key: 'catatan',            label: 'Catatan',              description: 'Informasi tambahan atau catatan lain yang tidak termasuk field di atas. Isi dengan "-" jika tidak ada.' },
    ],
  },
};

module.exports = config;

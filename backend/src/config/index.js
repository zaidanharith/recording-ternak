require('dotenv').config();

const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    chatModel: 'gemini-2.5-flash-lite',
  },

  sheets: {
    spreadsheetId: process.env.SPREADSHEET_ID,
    credentialsPath: './google-credentials.json',
    sheetNames: {
      recording: process.env.SHEET_RECORDING || 'Recording',
      kambing:   process.env.SHEET_KAMBING   || 'Kambing',
      peternak:  process.env.SHEET_PETERNAK  || 'Peternak',
    },
  },

  whatsapp: {
    accessToken:   process.env.WA_ACCESS_TOKEN,
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
    verifyToken:   process.env.WA_VERIFY_TOKEN,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey:    process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_development',
    jwtExpiresIn: '7d',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
  },

  dataSchema: {
    // Kolom sheet Recording
    recording: [
      { key: 'timestamp',          label: 'Timestamp'           },
      { key: 'nomor_telinga',      label: 'No. Telinga'         },
      { key: 'nama_peternak',      label: 'Nama Peternak'       },
      { key: 'tanggal_kawin',      label: 'Tanggal Kawin'       },
      { key: 'tanggal_beranak',    label: 'Tanggal Beranak'     },
      { key: 'jumlah_anak_jantan', label: 'Jumlah Anak Jantan'  },
      { key: 'jumlah_anak_betina', label: 'Jumlah Anak Betina'  },
      { key: 'perkawinan_ke',      label: 'Perkawinan Ke'       },
      { key: 'target_penjualan',   label: 'Target Penjualan'    },
      { key: 'terjual',            label: 'Terjual'             },
      { key: 'kondisi',            label: 'Kondisi'             },
      { key: 'catatan',            label: 'Catatan'             },
    ],

    // Kolom sheet Kambing
    kambing: [
      { key: 'nomor_telinga',  label: 'No. Telinga'   },
      { key: 'nama_peternak',  label: 'Nama Peternak' },
      { key: 'whatsapp_phone', label: 'No. WhatsApp'  },
      { key: 'createdAt',      label: 'Terdaftar'     },
    ],

    // Kolom sheet Peternak
    peternak: [
      { key: 'nama',           label: 'Nama Peternak' },
      { key: 'alamat',         label: 'Alamat'        },
      { key: 'whatsapp_phone', label: 'No. WhatsApp'  },
      { key: 'createdAt',      label: 'Terdaftar'     },
    ],

    // Field yang diekstrak AI dari pesan (untuk prompt Gemini)
    aiParseFields: [
      { key: 'nama_peternak',      description: 'Nama lengkap peternak pemilik kambing yang melaporkan.' },
      { key: 'nomor_telinga',      description: 'Nomor tag telinga kambing. Harus berupa angka bulat/integer saja tanpa huruf (misal: "123", "5"). Isi "-" jika tidak disebutkan.' },
      { key: 'alamat',             description: 'Alamat atau lokasi kandang peternak. Isi "-" jika tidak disebutkan.' },
      { key: 'tanggal_kawin',      description: 'Tanggal perkawinan kambing, format ISO YYYY-MM-DD. Isi "-" jika tidak disebutkan.' },
      { key: 'tanggal_beranak',    description: 'Tanggal melahirkan/beranak, format ISO YYYY-MM-DD. Isi "-" jika tidak disebutkan.' },
      { key: 'jumlah_anak_jantan', description: 'Jumlah anak jantan. Isi 0 jika tidak ada, "-" jika tidak disebutkan.' },
      { key: 'jumlah_anak_betina', description: 'Jumlah anak betina. Isi 0 jika tidak ada, "-" jika tidak disebutkan.' },
      { key: 'perkawinan_ke',      description: 'Urutan perkawinan (1, 2, 3...). Isi "-" jika tidak disebutkan.' },
      { key: 'target_penjualan',   description: 'Target tanggal/harga jual. Isi "-" jika tidak disebutkan.' },
      { key: 'terjual',            description: 'Status terjual: "Ya" jika sudah terjual, "Tidak" jika belum. Detail lain (misal jumlah yang terjual) masukkan ke catatan, bukan di sini. Isi "-" jika tidak disebutkan.' },
      { key: 'kondisi',            description: 'Kondisi kesehatan kambing saat ini: "Sehat" atau "Sakit". Isi "-" jika tidak disebutkan.' },
      { key: 'catatan',            description: 'Informasi tambahan. Isi "-" jika tidak ada.' },
    ],
  },
};

module.exports = config;

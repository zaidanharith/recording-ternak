# Recording Ternak via WhatsApp & Google Sheets

Bot WhatsApp yang membaca laporan hewan ternak dalam bahasa Indonesia bebas, mengekstraknya menggunakan Gemini AI, dan menyimpan hasilnya ke Google Spreadsheet secara otomatis.

---

## Prasyarat

- Node.js v18 ke atas
- Google Chrome / Chromium terinstal di sistem
- Akun Google dengan akses ke Google Sheets

---

## Cara Setup

### 1. Install Dependensi

```bash
npm install
```

### 2. Konfigurasi Environment Variables

Duplikat file `.env.example` menjadi `.env`, lalu isi nilainya:

```bash
cp .env.example .env
```

| Variabel | Keterangan |
|---|---|
| `GEMINI_API_KEY` | API Key dari [Google AI Studio](https://aistudio.google.com/) |
| `SPREADSHEET_ID` | ID Google Spreadsheet tujuan (dari URL: `...spreadsheets/d/[ID]/...`) |
| `SHEET_NAME` | Nama tab/sheet, default: `Recording Ternak` |

### 3. Konfigurasi Google Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru atau pilih project yang sudah ada.
3. Aktifkan **Google Sheets API** di Library.
4. Buat **Service Account** baru di IAM & Admin.
5. Buat Key baru bertipe **JSON**, simpan file tersebut sebagai `google-credentials.json` di root folder.
6. Buka Google Spreadsheet tujuan, klik **Share**, lalu bagikan ke email Service Account dengan hak akses **Editor**.

### 4. Jalankan Bot

```bash
# Mode produksi
npm start

# Mode development (auto-reload)
npm run dev
```

Saat pertama kali dijalankan, QR Code akan muncul di terminal. Buka WhatsApp di HP → **Perangkat tertaut** → **Tautkan perangkat** → scan QR tersebut.

Sesi login akan disimpan otomatis di folder `.wwebjs_auth/` sehingga tidak perlu scan ulang di lain waktu.

---

## Cara Mengubah Skema Data Ternak

Semua kolom data yang direkam dikonfigurasi di **`src/config.js`** pada bagian `dataSchema.columns`. Untuk menambah, menghapus, atau mengubah kolom:

1. Edit array `columns` di `src/config.js`.
2. Kosongkan baris header di Google Spreadsheet (baris pertama), karena header akan dibuat ulang secara otomatis saat bot dijalankan.

---

## Contoh Laporan WhatsApp

Bot dapat memproses laporan dalam format apapun, misalnya:

- *"sapi limosin pak tono yang eartag kuning no 7 tadi disuntik antibiotik, kondisi sedikit demam"*
- *"kambing etawa betina punya bu sari melahirkan 2 anak, keduanya sehat"*
- *"domba hitam no 3 mati pagi ini, kemarin sudah kelihatan lemas"*

---

## Struktur File

```
recording-ternak/
├── src/
│   ├── config.js       # Konfigurasi & skema data ternak
│   ├── gemini.js       # Gemini AI parser
│   ├── sheets.js       # Google Sheets writer
│   ├── whatsapp.js     # WhatsApp bot client
│   └── index.js        # Entry point utama
├── .env                # Environment variables (JANGAN di-commit ke Git)
├── .env.example        # Template environment variables
├── google-credentials.json  # Kredensial Service Account (JANGAN di-commit)
├── package.json
└── README.md
```

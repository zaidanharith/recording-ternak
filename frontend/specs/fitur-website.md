# Fitur Website Recording Ternak

Catatan fitur-fitur yang dibutuhkan untuk frontend dashboard.

## Konteks & Tujuan

Proses lama: petugas keliling ke tiap kandang, catat data di kertas, lalu input manual ke Excel/spreadsheet. Sistem WhatsApp + Gemini AI menggantikan pencatatan kertas — peternak (baik yang sudah lapor sendiri via WA maupun yang masih dibantu petugas) mengirim data lewat WA, lalu AI mem-parsing jadi data terstruktur.

**Tujuan website ini**: memberi petugas recording dan pemangku program cara memantau, memverifikasi, dan menindaklanjuti data dari layar, sehingga keliling fisik ke kandang tidak lagi diperlukan untuk hal-hal rutin.

## 1. Autentikasi & Role

- Login manual (email & password) serta login with Google.
- Akun `SUPERADMIN` dibuat manual di Supabase (bukan lewat website).
- Akun `ADMIN` (petugas) hanya bisa didaftarkan oleh `SUPERADMIN`.
- Akun `VIEWER` (stakeholder program/KKN/dinas) juga hanya bisa didaftarkan oleh `SUPERADMIN` — akses lihat dashboard & laporan saja, tanpa CRUD/verifikasi.
- Tidak ada fitur register untuk user umum.
- Fitur edit profil untuk user yang login (nama, foto, password).

## 2. Dashboard / Beranda

- Halaman home `/` langsung berupa halaman login; jika berhasil login, arahkan ke dashboard.
- Dashboard terdiri dari beberapa halaman dengan navigasi via sidebar. Jumlah halaman dijaga tidak terlalu banyak.
- Usulan struktur halaman (final ditentukan saat implementasi):
  - **Ringkasan**: kartu statistik (total peternak, total kambing, recording masuk minggu/bulan ini, jumlah recording menunggu verifikasi, jumlah peternak belum lapor, status sync Sheets terakhir) + visualisasi data (tren recording per waktu, jumlah anak lahir jantan/betina, kambing terjual vs target jual) dan daftar alert (kambing belum recording 30 hari terakhir).
  - **Peternak** (CRUD)
  - **Kambing** (CRUD)
  - **Recording** (CRUD + queue verifikasi)
  - **Riwayat Chat WA** (per peternak)
  - **Follow-up** (peternak belum lapor + reminder)
  - **Pengaturan/Profil**

## 3. Manajemen Peternak (Farmer)

- `ADMIN` dapat melakukan CRUD data peternak.
- `VIEWER` hanya bisa melihat, tidak bisa CRUD.

## 4. Manajemen Kambing (Goat)

- `ADMIN` dapat melakukan CRUD data kambing.
- Setiap kambing yang melahirkan, anaknya diartikan sebagai kambing baru (entri `Goat` terpisah), bukan field di dalam kambing induk.
- Penomoran telinga (ear tag) bersifat manual secara default. Tersedia opsi untuk mengisi otomatis dengan menambah 1 dari nomor kambing terbesar yang ada.

## 5. Recording

- Setiap proses recording menginput data sesuai field tabel `Recording` (tanggal kawin, tanggal lahir, jumlah anak jantan/betina, nomor kawin, target jual, status jual, catatan).
- Semua field bersifat opsional, kecuali data kambing (relasi ke `Goat` wajib ada).
- Recording bisa berasal dari dua sumber:
  - **Otomatis dari parsing WA** (Gemini AI) — masuk dengan status "perlu direview" agar `ADMIN` bisa mengecek/mengoreksi field yang kosong atau tidak sesuai sebelum dianggap final dan disinkron ke Sheets.
  - **Manual oleh `ADMIN`** langsung dari website — otomatis berstatus final, tidak perlu direview.
- Setiap recording, `ADMIN` dapat menambahkan foto kondisi kambing terkini (disimpan di Cloudinary).

## 6. Integrasi Google Sheets

- Setiap perubahan data di website (create/update/delete lewat database) harus tersinkron ke spreadsheet.
- Indikator status sync terakhir (berhasil/gagal) di dashboard, dengan opsi retry manual jika gagal.

## 7. Riwayat Chat WhatsApp

- `ADMIN` dapat melihat histori percakapan asli peternak (dari tabel `ChatMessage`) per nomor WA — untuk audit ketika hasil parsing recording meragukan, tanpa perlu telepon/datang ke kandang.

## 8. Follow-up Peternak Belum Lapor

- List peternak yang belum melakukan recording dalam periode tertentu.
- Tombol kirim reminder WhatsApp otomatis, per peternak atau massal ke semua yang belum lapor.

## 9. Visualisasi & Alert

- Visualisasi data di dashboard untuk membantu `ADMIN` memahami kondisi recording saat ini (lihat poin 2).
- Alert untuk kambing yang belum dilakukan recording selama 30 hari terakhir.

## 10. Lain-lain / Ide Tambahan

- ***

## Format per fitur (opsional, contoh)

- **Nama fitur**:
- **Deskripsi**:
- **Halaman/route**:
- **Prioritas**: (must have / nice to have)
- **Status**: (belum dikerjakan / in progress / selesai)

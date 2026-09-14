export interface GenerateAktaKelahiranInput {
  jenisKelamin: "JANTAN" | "BETINA";
  tanggalLahir: string;
  rasRumpun?: string;
  catatan?: string;
  format?: "docx" | "pdf";
}

export interface LaporanKelahiranTernak {
  id: string;
  kodeTernak: string;
  jenisKelamin: "JANTAN" | "BETINA" | null;
  tanggalLahir: string | null;
  peternak: { id: string; nama: string };
  jenisTernak: { id: string; nama: string };
}

export interface LaporanKelahiran {
  id: string;
  ternakId: string;
  tanggalLahir: string;
  catatan: string | null;
  nomorAkta: string | null;
  createdAt: string;
  ternak: LaporanKelahiranTernak;
}

export interface UpdateLaporanKelahiranInput {
  tanggalLahir?: string;
  catatan?: string;
  nomorAkta?: string;
}

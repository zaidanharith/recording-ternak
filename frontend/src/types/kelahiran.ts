export interface GenerateAktaKelahiranInput {
  jenisKelamin: "JANTAN" | "BETINA";
  tanggalLahir: string;
  rasRumpun?: string;
  catatan?: string;
  format?: "docx" | "pdf";
}

export interface LaporanKelahiranGoat {
  id: string;
  earTagNumber: number;
  jenisKelamin: "JANTAN" | "BETINA" | null;
  farmer: { id: string; name: string };
}

export interface LaporanKelahiran {
  id: string;
  goatId: string;
  petugasNama: string;
  tanggalLahir: string;
  catatan: string | null;
  nomorAkta: string | null;
  createdAt: string;
  goat: LaporanKelahiranGoat;
}

export interface UpdateLaporanKelahiranInput {
  tanggalLahir?: string;
  catatan?: string;
  nomorAkta?: string;
}

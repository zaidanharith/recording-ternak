export interface PenyebabKematian {
  id: string;
  nama: string;
}

export interface GenerateBeritaAcaraInput {
  tanggalKematian: string;
  penyebabKematianId: string;
  catatan?: string;
  jenisKelamin?: "JANTAN" | "BETINA";
  tanggalLahir?: string;
  rasRumpun?: string;
  format?: "docx" | "pdf";
}

export interface LaporanKematianGoat {
  id: string;
  earTagNumber: number;
  jenisKelamin: "JANTAN" | "BETINA" | null;
  birthDate: string | null;
  farmer: { id: string; name: string };
}

export interface LaporanKematian {
  id: string;
  goatId: string;
  penyebabKematianId: string;
  tanggalKematian: string;
  catatan: string | null;
  nomorBeritaAcara: string | null;
  createdAt: string;
  goat: LaporanKematianGoat;
  penyebabKematian: PenyebabKematian;
}

export interface UpdateLaporanKematianInput {
  penyebabKematianId?: string;
  tanggalKematian?: string;
  catatan?: string;
}

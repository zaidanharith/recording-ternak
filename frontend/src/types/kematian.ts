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

export interface LaporanKematianTernak {
  id: string;
  kodeTernak: string;
  jenisKelamin: "JANTAN" | "BETINA" | null;
  tanggalLahir: string | null;
  peternak: { id: string; nama: string };
  jenisTernak: { id: string; nama: string };
}

export interface LaporanKematian {
  id: string;
  ternakId: string;
  penyebabKematianId: string;
  tanggalKematian: string;
  catatan: string | null;
  nomorBeritaAcara: string | null;
  createdAt: string;
  ternak: LaporanKematianTernak;
  penyebabKematian: PenyebabKematian;
}

export interface UpdateLaporanKematianInput {
  penyebabKematianId?: string;
  tanggalKematian?: string;
  catatan?: string;
}

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

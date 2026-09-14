import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";
import type {
  GenerateBeritaAcaraInput,
  LaporanKematian,
  PenyebabKematian,
  UpdateLaporanKematianInput,
} from "@/types/kematian";

export async function getPenyebabKematianOptions(): Promise<PenyebabKematian[]> {
  const { data } = await api.get<ApiResponse<{ penyebabKematian: PenyebabKematian[] }>>(
    "/kematian/form-options",
  );
  return data.data!.penyebabKematian;
}

export async function generateBeritaAcara(
  goatId: string,
  input: GenerateBeritaAcaraInput,
): Promise<Blob> {
  const { data } = await api.post(`/kematian/goats/${goatId}/generate`, input, {
    responseType: "blob",
  });
  return data;
}

export async function listLaporanKematian(): Promise<LaporanKematian[]> {
  const { data } = await api.get<ApiResponse<{ laporanKematian: LaporanKematian[] }>>(
    "/kematian",
  );
  return data.data!.laporanKematian;
}

export async function getLaporanKematian(id: string): Promise<LaporanKematian> {
  const { data } = await api.get<ApiResponse<{ laporan: LaporanKematian }>>(
    `/kematian/${id}`,
  );
  return data.data!.laporan;
}

export async function updateLaporanKematian(
  id: string,
  input: UpdateLaporanKematianInput,
): Promise<LaporanKematian> {
  const { data } = await api.patch<ApiResponse<{ laporan: LaporanKematian }>>(
    `/kematian/${id}`,
    input,
  );
  return data.data!.laporan;
}

export async function deleteLaporanKematian(id: string): Promise<void> {
  await api.delete(`/kematian/${id}`);
}

export async function downloadBeritaAcaraById(
  id: string,
  format: "docx" | "pdf",
): Promise<Blob> {
  const { data } = await api.get(`/kematian/${id}/download`, {
    params: { format },
    responseType: "blob",
  });
  return data;
}

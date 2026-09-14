import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";
import type {
  GenerateAktaKelahiranInput,
  LaporanKelahiran,
  UpdateLaporanKelahiranInput,
} from "@/types/kelahiran";

export async function generateAktaKelahiran(
  goatId: string,
  input: GenerateAktaKelahiranInput,
): Promise<Blob> {
  const { data } = await api.post(`/kelahiran/goats/${goatId}/generate`, input, {
    responseType: "blob",
  });
  return data;
}

export async function listLaporanKelahiran(): Promise<LaporanKelahiran[]> {
  const { data } = await api.get<ApiResponse<{ laporanKelahiran: LaporanKelahiran[] }>>(
    "/kelahiran",
  );
  return data.data!.laporanKelahiran;
}

export async function getLaporanKelahiran(id: string): Promise<LaporanKelahiran> {
  const { data } = await api.get<ApiResponse<{ laporan: LaporanKelahiran }>>(
    `/kelahiran/${id}`,
  );
  return data.data!.laporan;
}

export async function updateLaporanKelahiran(
  id: string,
  input: UpdateLaporanKelahiranInput,
): Promise<LaporanKelahiran> {
  const { data } = await api.patch<ApiResponse<{ laporan: LaporanKelahiran }>>(
    `/kelahiran/${id}`,
    input,
  );
  return data.data!.laporan;
}

export async function deleteLaporanKelahiran(id: string): Promise<void> {
  await api.delete(`/kelahiran/${id}`);
}

export async function downloadAktaById(
  id: string,
  format: "docx" | "pdf",
): Promise<Blob> {
  const { data } = await api.get(`/kelahiran/${id}/download`, {
    params: { format },
    responseType: "blob",
  });
  return data;
}

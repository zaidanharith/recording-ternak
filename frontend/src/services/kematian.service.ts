import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";
import type { GenerateBeritaAcaraInput, PenyebabKematian } from "@/types/kematian";

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

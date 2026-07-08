import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";

export interface UploadPhotoResult {
  url: string;
  publicId: string;
}

export async function uploadPhoto(file: File): Promise<UploadPhotoResult> {
  const formData = new FormData();
  formData.append("photo", file);

  const { data } = await api.post<ApiResponse<UploadPhotoResult>>(
    "/uploads/photo",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data!;
}

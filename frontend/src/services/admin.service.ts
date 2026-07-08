import { api } from "@/lib/axios";
import type { Admin, CreateAdminInput, UpdateAdminInput } from "@/types/admin";
import type { ApiResponse } from "@/types/common";

export async function listAdmins(): Promise<Admin[]> {
  const { data } =
    await api.get<ApiResponse<{ admins: Admin[] }>>("/admins");
  return data.data!.admins;
}

export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  const { data } = await api.post<ApiResponse<{ admin: Admin }>>(
    "/admins",
    input,
  );
  return data.data!.admin;
}

export async function updateAdmin(
  id: string,
  input: UpdateAdminInput,
): Promise<Admin> {
  const { data } = await api.patch<ApiResponse<{ admin: Admin }>>(
    `/admins/${id}`,
    input,
  );
  return data.data!.admin;
}

export async function deleteAdmin(id: string): Promise<void> {
  await api.delete(`/admins/${id}`);
}

import { api } from "@/lib/axios";
import type { ChatMessage } from "@/types/chat";
import type { ApiResponse, PaginationMeta } from "@/types/common";
import type {
  CreateFarmerInput,
  ExportFarmersQuery,
  Farmer,
  ListFarmersQuery,
  UpdateFarmerInput,
} from "@/types/farmer";

export async function listFarmers(
  query: ListFarmersQuery = {},
): Promise<{ farmers: Farmer[]; meta: PaginationMeta }> {
  const { data } = await api.get<
    ApiResponse<{ farmers: Farmer[]; meta: PaginationMeta }>
  >("/farmers", { params: query });
  return data.data!;
}

export async function getFarmer(id: string): Promise<Farmer> {
  const { data } =
    await api.get<ApiResponse<{ farmer: Farmer }>>(`/farmers/${id}`);
  return data.data!.farmer;
}

export async function createFarmer(input: CreateFarmerInput): Promise<Farmer> {
  const { data } = await api.post<ApiResponse<{ farmer: Farmer }>>(
    "/farmers",
    input,
  );
  return data.data!.farmer;
}

export async function updateFarmer(
  id: string,
  input: UpdateFarmerInput,
): Promise<Farmer> {
  const { data } = await api.patch<ApiResponse<{ farmer: Farmer }>>(
    `/farmers/${id}`,
    input,
  );
  return data.data!.farmer;
}

export async function deleteFarmer(id: string): Promise<void> {
  await api.delete(`/farmers/${id}`);
}

export async function getFarmerChatMessages(
  id: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const { data } = await api.get<ApiResponse<{ messages: ChatMessage[] }>>(
    `/farmers/${id}/chat-messages`,
    { params: { limit } },
  );
  return data.data!.messages;
}

export async function sendFarmerReminder(id: string): Promise<string> {
  const { data } = await api.post<ApiResponse<null>>(`/farmers/${id}/reminder`);
  return data.message ?? "";
}

export async function exportFarmers(query: ExportFarmersQuery): Promise<Blob> {
  const { data } = await api.get("/farmers/export", {
    params: query,
    responseType: "blob",
  });
  return data;
}

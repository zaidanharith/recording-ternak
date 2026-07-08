import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";
import type { SyncStatus } from "@/types/sync";

export async function getSyncStatus(): Promise<SyncStatus> {
  const { data } =
    await api.get<ApiResponse<{ sync: SyncStatus }>>("/sync/status");
  return data.data!.sync;
}

export async function retrySync(): Promise<string> {
  const { data } = await api.post<ApiResponse<null>>("/sync/retry");
  return data.message ?? "";
}

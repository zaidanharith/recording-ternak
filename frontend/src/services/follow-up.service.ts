import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";
import type { Farmer } from "@/types/farmer";

export async function listNotReported(
  days = 30,
): Promise<{ farmers: Farmer[]; days: number }> {
  const { data } = await api.get<
    ApiResponse<{ farmers: Farmer[]; days: number }>
  >("/follow-ups", { params: { days } });
  return data.data!;
}

export async function sendBulkReminder(
  days = 30,
): Promise<{ sentCount: number; failedCount: number }> {
  const { data } = await api.post<
    ApiResponse<{ sentCount: number; failedCount: number }>
  >("/follow-ups/reminders", { days });
  return data.data!;
}

import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/common";
import type {
  DashboardAlert,
  DashboardCharts,
  DashboardSummary,
} from "@/types/dashboard";

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<ApiResponse<{ summary: DashboardSummary }>>(
    "/dashboard/summary",
  );
  return data.data!.summary;
}

export async function getCharts(): Promise<DashboardCharts> {
  const { data } = await api.get<ApiResponse<{ charts: DashboardCharts }>>(
    "/dashboard/charts",
  );
  return data.data!.charts;
}

export async function getAlerts(): Promise<DashboardAlert[]> {
  const { data } = await api.get<ApiResponse<{ alerts: DashboardAlert[] }>>(
    "/dashboard/alerts",
  );
  return data.data!.alerts;
}

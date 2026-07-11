import type { SyncStatus } from "@/types/sync";

export interface DashboardSummary {
  totalFarmers: number;
  totalGoats: number;
  recordingsLast7Days: number;
  recordingsLast30Days: number;
  pendingReviewCount: number;
  farmersNotReportedCount: number;
  lastSync: SyncStatus;
}

export interface RecordingTrendPoint {
  date: string;
  count: number;
}

export interface DashboardCharts {
  recordingTrend: RecordingTrendPoint[];
  kidsBornByGender: { male: number; female: number };
  soldVsTarget: { sold: number; targetOnly: number };
}

export interface DashboardAlert {
  goatId: string;
  earTagNumber: number;
  farmerId: string;
  farmerName: string;
}

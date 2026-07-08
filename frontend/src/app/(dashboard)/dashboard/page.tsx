"use client";

import { useCallback } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBarChart } from "@/features/dashboard/components/category-bar-chart";
import { GoatAlertsList } from "@/features/dashboard/components/goat-alerts-list";
import { RecordingTrendChart } from "@/features/dashboard/components/recording-trend-chart";
import { StatCards } from "@/features/dashboard/components/stat-cards";
import { SyncStatusBadge } from "@/features/dashboard/components/sync-status-badge";
import { useAsync } from "@/hooks/use-async";
import { getAlerts, getCharts, getSummary } from "@/services/dashboard.service";

export default function DashboardPage() {
  const fetchDashboard = useCallback(async () => {
    const [summary, charts, alerts] = await Promise.all([
      getSummary(),
      getCharts(),
      getAlerts(),
    ]);
    return { summary, charts, alerts };
  }, []);

  const { data, isLoading, error, refetch } = useAsync(fetchDashboard);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <EmptyState message="Gagal memuat data dashboard." />;
  }

  const { summary, charts, alerts } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ringkasan"
        description="Pantau kondisi recording ternak secara real-time"
        action={<SyncStatusBadge status={summary.lastSync} onRetried={refetch} />}
      />

      <StatCards summary={summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecordingTrendChart data={charts.recordingTrend} />
        </div>
        <GoatAlertsList alerts={alerts} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CategoryBarChart
          title="Jumlah Anak Lahir per Jenis Kelamin"
          data={[
            { name: "Jantan", value: charts.kidsBornByGender.male },
            { name: "Betina", value: charts.kidsBornByGender.female },
          ]}
          colors={["var(--chart-1)", "var(--chart-2)"]}
        />
        <CategoryBarChart
          title="Kambing Terjual vs Target Jual"
          data={[
            { name: "Terjual", value: charts.soldVsTarget.sold },
            { name: "Target Saja", value: charts.soldVsTarget.targetOnly },
          ]}
          colors={["var(--chart-3)", "var(--chart-4)"]}
        />
      </div>
    </div>
  );
}

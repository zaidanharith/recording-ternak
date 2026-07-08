import type { IconType } from "react-icons";
import {
  FiClipboard,
  FiClock,
  FiTag,
  FiUserX,
  FiUsers,
} from "react-icons/fi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/dashboard";

interface StatCardsProps {
  summary: DashboardSummary;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: IconType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

export function StatCards({ summary }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total Peternak" value={summary.totalFarmers} icon={FiUsers} />
      <StatCard label="Total Kambing" value={summary.totalGoats} icon={FiTag} />
      <StatCard
        label="Recording 7 Hari"
        value={summary.recordingsLast7Days}
        icon={FiClipboard}
      />
      <StatCard
        label="Recording 30 Hari"
        value={summary.recordingsLast30Days}
        icon={FiClipboard}
      />
      <StatCard
        label="Menunggu Review"
        value={summary.pendingReviewCount}
        icon={FiClock}
      />
      <StatCard
        label="Belum Lapor"
        value={summary.farmersNotReportedCount}
        icon={FiUserX}
      />
    </div>
  );
}

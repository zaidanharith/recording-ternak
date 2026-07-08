import Link from "next/link";
import { FiAlertTriangle } from "react-icons/fi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import type { DashboardAlert } from "@/types/dashboard";

interface GoatAlertsListProps {
  alerts: DashboardAlert[];
}

export function GoatAlertsList({ alerts }: GoatAlertsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FiAlertTriangle className="size-4 text-destructive" />
          Kambing Belum Recording 30 Hari Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState message="Tidak ada kambing yang perlu diperhatikan." />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {alerts.map((alert) => (
              <li
                key={alert.goatId}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    No. Telinga {alert.earTagNumber}
                  </p>
                  <p className="text-muted-foreground">{alert.farmerName}</p>
                </div>
                <Link
                  href={`/kambing?farmerId=${alert.farmerId}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Lihat
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

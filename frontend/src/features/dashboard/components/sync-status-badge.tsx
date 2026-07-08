"use client";

import { useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canManageData } from "@/lib/rbac";
import { retrySync } from "@/services/sync.service";
import { useAuthStore } from "@/stores/auth.store";
import type { SyncStatus } from "@/types/sync";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  onRetried?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  BELUM_PERNAH: "Belum pernah sync",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
};

export function SyncStatusBadge({ status, onRetried }: SyncStatusBadgeProps) {
  const role = useAuthStore((state) => state.admin?.role);
  const [isRetrying, setIsRetrying] = useState(false);

  const isFailed = status.lastStatus === "FAILED";

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retrySync();
      toast.success("Sinkronisasi ulang berhasil.");
      onRetried?.();
    } catch {
      toast.error("Sinkronisasi ulang gagal.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isFailed ? "destructive" : "secondary"}>
        Sync Sheets: {STATUS_LABEL[status.lastStatus] ?? status.lastStatus}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {status.lastSyncAt
          ? new Date(status.lastSyncAt).toLocaleString("id-ID")
          : "-"}
      </span>
      {isFailed && canManageData(role) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRetrying}
          onClick={handleRetry}
        >
          <FiRefreshCw className={isRetrying ? "size-3.5 animate-spin" : "size-3.5"} />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

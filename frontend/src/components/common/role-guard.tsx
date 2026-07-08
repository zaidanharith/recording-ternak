"use client";

import { FiAlertTriangle } from "react-icons/fi";

import { useAuthStore } from "@/stores/auth.store";
import type { AdminRole } from "@/types/admin";

interface RoleGuardProps {
  allow: AdminRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const role = useAuthStore((state) => state.admin?.role);

  if (!role || !allow.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
        <FiAlertTriangle className="size-6" />
        <p className="text-sm">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return <>{children}</>;
}

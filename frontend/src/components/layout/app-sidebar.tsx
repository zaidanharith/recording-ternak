"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useAuthStore } from "@/stores/auth.store";

export function AppSidebar() {
  const role = useAuthStore((state) => state.admin?.role);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar p-4 md:flex md:flex-col">
      <div className="mb-6 px-2">
        <span className="text-lg font-semibold text-sidebar-foreground">
          Recording Ternak
        </span>
      </div>
      <SidebarNav role={role} />
    </aside>
  );
}

"use client";

import { FiLogOut } from "react-icons/fi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useLogout } from "@/hooks/use-logout";
import { useAuthStore } from "@/stores/auth.store";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const admin = useAuthStore((state) => state.admin);
  const handleLogout = useLogout();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar p-4 md:flex md:flex-col">
      <div className="mb-6 px-2">
        <span className="text-lg font-semibold text-sidebar-foreground">
          Recording Ternak
        </span>
        <p className="text-xs text-muted-foreground">
          Layanan oleh Bumdes Sumber Abadi Desa Besuki
        </p>
      </div>
      <SidebarNav role={admin?.role} />

      {admin && (
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 px-2">
            <Avatar className="size-8">
              <AvatarImage src={admin.avatarUrl ?? undefined} alt={admin.name} />
              <AvatarFallback>{initials(admin.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {admin.name}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={handleLogout}
          >
            <FiLogOut className="size-4" />
            Keluar
          </Button>
        </div>
      )}
    </aside>
  );
}

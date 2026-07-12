"use client";

import Image from "next/image";
import { FiLogOut } from "react-icons/fi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogoutConfirmDialog } from "@/components/layout/logout-confirm-dialog";
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Image
          src="/logo-bumdes.png"
          alt="Logo Bumdes Sumber Abadi"
          width={36}
          height={36}
        />
        <div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            Recording Ternak
          </span>
          <p className="text-xs text-muted-foreground">
            Layanan oleh Bumdes Sumber Abadi Desa Besuki
          </p>
        </div>
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
          <LogoutConfirmDialog
            onConfirm={handleLogout}
            trigger={
              <Button variant="destructive" size="sm" className="justify-start">
                <FiLogOut className="size-4" />
                Keluar
              </Button>
            }
          />
        </div>
      )}
    </aside>
  );
}

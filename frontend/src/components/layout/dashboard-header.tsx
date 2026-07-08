"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export function DashboardHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <MobileNav />
      <p className="hidden text-xs text-muted-foreground md:block">
        Layanan oleh Bumdes Sumber Abadi Desa Besuki
      </p>
      <div className="flex-1" />
      <UserMenu />
    </header>
  );
}

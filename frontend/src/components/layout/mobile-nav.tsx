"use client";

import { useState } from "react";
import Image from "next/image";
import { FiLogOut, FiMenu } from "react-icons/fi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const admin = useAuthStore((state) => state.admin);
  const handleLogout = useLogout();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Buka menu" className="md:hidden">
            <FiMenu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-64 flex-col p-4">
        <SheetHeader className="px-0">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-bumdes.png"
              alt="Logo Bumdes Sumber Abadi"
              width={32}
              height={32}
            />
            <SheetTitle>Recording Ternak</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Layanan oleh Bumdes Sumber Abadi Desa Besuki
          </p>
        </SheetHeader>
        <div className="mt-4 flex-1">
          <SidebarNav role={admin?.role} onNavigate={() => setOpen(false)} />
        </div>

        {admin && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 px-2">
              <Avatar className="size-8">
                <AvatarImage src={admin.avatarUrl ?? undefined} alt={admin.name} />
                <AvatarFallback>{initials(admin.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{admin.name}</span>
            </div>
            <LogoutConfirmDialog
              onConfirm={() => {
                setOpen(false);
                handleLogout();
              }}
              trigger={
                <Button variant="destructive" size="sm" className="justify-start">
                  <FiLogOut className="size-4" />
                  Keluar
                </Button>
              }
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

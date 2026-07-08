"use client";

import { useState } from "react";
import { FiMenu } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useAuthStore } from "@/stores/auth.store";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((state) => state.admin?.role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Buka menu" className="md:hidden">
            <FiMenu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 p-4">
        <SheetHeader className="px-0">
          <SheetTitle>Recording Ternak</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { FiUsers } from "react-icons/fi";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { isSuperAdmin } from "@/lib/rbac";
import { useAuthStore } from "@/stores/auth.store";

export default function PengaturanPage() {
  const role = useAuthStore((state) => state.admin?.role);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Pengaturan"
        description="Kelola profil akun Anda"
        action={
          isSuperAdmin(role) && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/pengaturan/akun" />}
            >
              <FiUsers className="size-4" />
              Kelola Akun
            </Button>
          )
        }
      />
      <ProfileForm />
    </div>
  );
}

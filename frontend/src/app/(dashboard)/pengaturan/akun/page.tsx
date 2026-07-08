"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { RoleGuard } from "@/components/common/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminFormDialog } from "@/features/admins/components/admin-form-dialog";
import { useAsync } from "@/hooks/use-async";
import { deleteAdmin, listAdmins } from "@/services/admin.service";

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  VIEWER: "Viewer",
};

function AkunContent() {
  const fetcher = useCallback(() => listAdmins(), []);
  const { data: admins, isLoading, refetch } = useAsync(fetcher);

  const handleDelete = async (id: string) => {
    try {
      await deleteAdmin(id);
      toast.success("Akun berhasil dihapus.");
      refetch();
    } catch {
      toast.error("Gagal menghapus akun.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Kelola Akun"
        description="Daftarkan akun Admin (petugas) dan Viewer (stakeholder)"
        action={<AdminFormDialog onSaved={() => refetch()} />}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !admins || admins.length === 0 ? (
        <EmptyState message="Belum ada akun terdaftar." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">{admin.name}</TableCell>
                <TableCell>{admin.username}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <Badge variant={admin.role === "SUPERADMIN" ? "default" : "secondary"}>
                    {ROLE_LABEL[admin.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {admin.role !== "SUPERADMIN" && (
                    <div className="flex justify-end gap-1">
                      <AdminFormDialog
                        admin={admin}
                        onSaved={() => refetch()}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Edit">
                            <FiEdit2 className="size-3.5" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Hapus">
                            <FiTrash2 className="size-3.5 text-destructive" />
                          </Button>
                        }
                        title="Hapus Akun"
                        description={`Yakin ingin menghapus akun ${admin.name}?`}
                        onConfirm={() => handleDelete(admin.id)}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function AkunPage() {
  return (
    <RoleGuard allow={["SUPERADMIN"]}>
      <AkunContent />
    </RoleGuard>
  );
}

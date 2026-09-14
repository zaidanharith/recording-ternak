"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiDownload, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LaporanKelahiranEditDialog } from "@/features/kelahiran/components/laporan-kelahiran-edit-dialog";
import { AktaKelahiranDialog } from "@/features/goats/components/akta-kelahiran-dialog";
import { useAsync } from "@/hooks/use-async";
import { downloadBlob } from "@/lib/download-file";
import { canManageData } from "@/lib/rbac";
import {
  deleteLaporanKelahiran,
  downloadAktaById,
  listLaporanKelahiran,
} from "@/services/kelahiran.service";
import { useAuthStore } from "@/stores/auth.store";

export default function LaporanKelahiranPage() {
  const role = useAuthStore((state) => state.admin?.role);
  const canManage = canManageData(role);

  const fetcher = useCallback(() => listLaporanKelahiran(), []);
  const { data: laporanList, isLoading, refetch } = useAsync(fetcher);

  const handleDownload = async (id: string, kodeTernak: string, format: "docx" | "pdf") => {
    try {
      const blob = await downloadAktaById(id, format);
      downloadBlob(blob, `akta-kelahiran-${kodeTernak}.${format}`);
    } catch {
      toast.error("Gagal mengunduh akta kelahiran.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLaporanKelahiran(id);
      toast.success("Laporan kelahiran berhasil dihapus.");
      refetch();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal menghapus laporan kelahiran.";
      toast.error(message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Laporan Kelahiran"
        description="Akta kelahiran kambing yang sudah dibuat"
        action={canManage && <AktaKelahiranDialog onCreated={refetch} />}
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !laporanList || laporanList.length === 0 ? (
        <EmptyState message="Belum ada laporan kelahiran." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Telinga</TableHead>
              <TableHead>Peternak</TableHead>
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Tanggal Lahir</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {laporanList.map((laporan) => (
              <TableRow key={laporan.id}>
                <TableCell className="font-medium">{laporan.goat.earTagNumber}</TableCell>
                <TableCell>{laporan.goat.farmer.name}</TableCell>
                <TableCell>
                  {laporan.goat.jenisKelamin === "JANTAN" ? "Jantan" : "Betina"}
                </TableCell>
                <TableCell>
                  {new Date(laporan.tanggalLahir).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="Unduh akta kelahiran">
                            <FiDownload className="size-3.5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDownload(laporan.id, String(laporan.goat.earTagNumber), "docx")}
                        >
                          Unduh Word (.docx)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownload(laporan.id, String(laporan.goat.earTagNumber), "pdf")}
                        >
                          Unduh PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {canManage && (
                      <>
                        <LaporanKelahiranEditDialog laporan={laporan} onSaved={() => refetch()} />
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Hapus">
                              <FiTrash2 className="size-3.5 text-destructive" />
                            </Button>
                          }
                          title="Hapus Laporan Kelahiran"
                          description={`Yakin ingin menghapus laporan kelahiran untuk kambing No. Telinga ${laporan.goat.earTagNumber}? Data kambing itu sendiri tidak ikut terhapus.`}
                          onConfirm={() => handleDelete(laporan.id)}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiDownload, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
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
import { LaporanKematianEditDialog } from "@/features/kematian/components/laporan-kematian-edit-dialog";
import { useAsync } from "@/hooks/use-async";
import { downloadBlob } from "@/lib/download-file";
import { canManageData } from "@/lib/rbac";
import {
  deleteLaporanKematian,
  downloadBeritaAcaraById,
  listLaporanKematian,
} from "@/services/kematian.service";
import { useAuthStore } from "@/stores/auth.store";

export default function LaporanKematianPage() {
  const role = useAuthStore((state) => state.admin?.role);
  const canManage = canManageData(role);

  const fetcher = useCallback(() => listLaporanKematian(), []);
  const { data: laporanList, isLoading, refetch } = useAsync(fetcher);

  const handleDownload = async (id: string, kodeTernak: string, format: "docx" | "pdf") => {
    try {
      const blob = await downloadBeritaAcaraById(id, format);
      downloadBlob(blob, `berita-acara-${kodeTernak}.${format}`);
    } catch {
      toast.error("Gagal mengunduh berita acara.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLaporanKematian(id);
      toast.success("Laporan kematian berhasil dihapus.");
      refetch();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal menghapus laporan kematian.";
      toast.error(message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Laporan Kematian"
        description="Laporan kematian kambing yang sudah dibuatkan berita acara"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !laporanList || laporanList.length === 0 ? (
        <EmptyState message="Belum ada laporan kematian." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Telinga</TableHead>
              <TableHead>Peternak</TableHead>
              <TableHead>Tanggal Kematian</TableHead>
              <TableHead>Penyebab</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {laporanList.map((laporan) => (
              <TableRow key={laporan.id}>
                <TableCell className="font-medium">{laporan.goat.earTagNumber}</TableCell>
                <TableCell>{laporan.goat.farmer.name}</TableCell>
                <TableCell>
                  {new Date(laporan.tanggalKematian).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{laporan.penyebabKematian.nama}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="Unduh berita acara">
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
                        <LaporanKematianEditDialog laporan={laporan} onSaved={() => refetch()} />
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Hapus">
                              <FiTrash2 className="size-3.5 text-destructive" />
                            </Button>
                          }
                          title="Hapus Laporan Kematian"
                          description={`Yakin ingin menghapus laporan kematian untuk kambing No. Telinga ${String(laporan.goat.earTagNumber)}? Status ternak akan dikembalikan menjadi HIDUP.`}
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

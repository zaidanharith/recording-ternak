"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SortableTableHead } from "@/components/common/sortable-table-head";
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
import { GoatExportDialog } from "@/features/goats/components/goat-export-dialog";
import { GoatFormDialog } from "@/features/goats/components/goat-form-dialog";
import { useAsync } from "@/hooks/use-async";
import { useSortableData } from "@/hooks/use-sortable-data";
import { canManageData } from "@/lib/rbac";
import { deleteGoat, listGoats } from "@/services/goat.service";
import { useAuthStore } from "@/stores/auth.store";

export default function KambingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <KambingPageContent />
    </Suspense>
  );
}

function KambingPageContent() {
  const role = useAuthStore((state) => state.admin?.role);
  const router = useRouter();
  const searchParams = useSearchParams();
  const farmerId = searchParams.get("farmerId") ?? undefined;
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => listGoats({ page, limit: 20, farmerId }),
    [page, farmerId],
  );
  const { data, isLoading, refetch } = useAsync(fetcher);

  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    data?.goats ?? [],
    {
      earTagNumber: (goat) => goat.earTagNumber,
      farmer: (goat) => goat.farmer?.name,
      createdAt: (goat) => goat.createdAt,
    },
  );

  const canManage = canManageData(role);

  const handleDelete = async (id: string) => {
    try {
      await deleteGoat(id);
      toast.success("Kambing berhasil dihapus.");
      refetch();
    } catch {
      toast.error("Gagal menghapus kambing.");
    }
  };

  const filterLabel = data?.goats[0]?.farmer?.name;

  return (
    <div>
      <PageHeader
        title="Kambing"
        description="Kelola data kambing yang terdaftar"
        action={
          <div className="flex items-center gap-2">
            <GoatExportDialog />
            {canManage && <GoatFormDialog onSaved={() => refetch()} />}
          </div>
        }
      />

      {farmerId && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary">
            Filter peternak: {filterLabel ?? farmerId}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hapus filter"
            onClick={() => router.push("/kambing")}
          >
            <FiX className="size-3.5" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.goats.length === 0 ? (
        <EmptyState message="Belum ada data kambing." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="earTagNumber"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  No. Telinga
                </SortableTableHead>
                <SortableTableHead
                  sortKey="farmer"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Peternak
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Terdaftar
                </SortableTableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((goat) => (
                <TableRow key={goat.id}>
                  <TableCell className="font-medium">{goat.earTagNumber}</TableCell>
                  <TableCell>{goat.farmer?.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(goat.createdAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <GoatFormDialog
                          goat={goat}
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
                          title="Hapus Kambing"
                          description={`Yakin ingin menghapus kambing no. telinga ${goat.earTagNumber}? Recording terkait juga akan terhapus.`}
                          onConfirm={() => handleDelete(goat.id)}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

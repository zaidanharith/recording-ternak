"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SortableTableHead } from "@/components/common/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FarmerFormDialog } from "@/features/farmers/components/farmer-form-dialog";
import { useAsync } from "@/hooks/use-async";
import { useDebounce } from "@/hooks/use-debounce";
import { useSortableData } from "@/hooks/use-sortable-data";
import { canManageData } from "@/lib/rbac";
import { deleteFarmer, listFarmers } from "@/services/farmer.service";
import { useAuthStore } from "@/stores/auth.store";

export default function PeternakPage() {
  const role = useAuthStore((state) => state.admin?.role);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const fetcher = useCallback(
    () => listFarmers({ page, limit: 20, search: debouncedSearch }),
    [page, debouncedSearch],
  );
  const { data, isLoading, refetch } = useAsync(fetcher);

  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    data?.farmers ?? [],
    {
      name: (farmer) => farmer.name,
      whatsappPhone: (farmer) => farmer.whatsappPhone,
      address: (farmer) => farmer.address,
    },
  );

  const canManage = canManageData(role);

  const handleDelete = async (id: string) => {
    try {
      await deleteFarmer(id);
      toast.success("Peternak berhasil dihapus.");
      refetch();
    } catch {
      toast.error("Gagal menghapus peternak.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Peternak"
        description="Kelola data peternak yang terdaftar"
        action={
          canManage && (
            <FarmerFormDialog onSaved={() => refetch()} />
          )
        }
      />

      <Input
        placeholder="Cari nama atau nomor WhatsApp..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="mb-4 max-w-sm"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.farmers.length === 0 ? (
        <EmptyState message="Belum ada data peternak." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="name"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Nama
                </SortableTableHead>
                <SortableTableHead
                  sortKey="whatsappPhone"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Nomor WhatsApp
                </SortableTableHead>
                <SortableTableHead
                  sortKey="address"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Alamat
                </SortableTableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((farmer) => (
                <TableRow key={farmer.id}>
                  <TableCell>
                    <Link
                      href={`/peternak/${farmer.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {farmer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{farmer.whatsappPhone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {farmer.address}
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <FarmerFormDialog
                          farmer={farmer}
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
                          title="Hapus Peternak"
                          description={`Yakin ingin menghapus ${farmer.name}? Data kambing dan recording terkait juga akan terhapus.`}
                          onConfirm={() => handleDelete(farmer.id)}
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

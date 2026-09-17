"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SortableTableHead } from "@/components/common/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RecordingConditionBadge,
  RecordingSoldBadge,
  RecordingSourceBadge,
  RecordingStatusBadge,
} from "@/features/recordings/components/recording-badges";
import { RecordingExportDialog } from "@/features/recordings/components/recording-export-dialog";
import { RecordingFormDialog } from "@/features/recordings/components/recording-form-dialog";
import { RecordingPhotoPreview } from "@/features/recordings/components/recording-photo-preview";
import { useAsync } from "@/hooks/use-async";
import { useSortableData } from "@/hooks/use-sortable-data";
import { canManageData } from "@/lib/rbac";
import { formatDateId } from "@/lib/format-date";
import { deleteRecording, listRecordings } from "@/services/recording.service";
import { useAuthStore } from "@/stores/auth.store";
import type { RecordingStatus } from "@/types/recording";

export default function RecordingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RecordingPageContent />
    </Suspense>
  );
}

function RecordingPageContent() {
  const role = useAuthStore((state) => state.admin?.role);
  const searchParams = useSearchParams();
  const goatId = searchParams.get("goatId") ?? undefined;
  const farmerId = searchParams.get("farmerId") ?? undefined;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<RecordingStatus | "ALL">("ALL");

  const fetcher = useCallback(
    () =>
      listRecordings({
        page,
        limit: 20,
        goatId,
        farmerId,
        status: status === "ALL" ? undefined : status,
      }),
    [page, goatId, farmerId, status],
  );
  const { data, isLoading, refetch } = useAsync(fetcher);

  const { sortedData, sortKey, sortDirection, toggleSort } = useSortableData(
    data?.recordings ?? [],
    {
      goat: (recording) => recording.goat?.earTagNumber,
      farmer: (recording) => recording.goat?.farmer?.name,
      birthDate: (recording) => recording.birthDate,
      source: (recording) => recording.source,
      status: (recording) => recording.status,
    },
  );

  const canManage = canManageData(role);

  const handleDelete = async (id: string) => {
    try {
      await deleteRecording(id);
      toast.success("Recording berhasil dihapus.");
      refetch();
    } catch {
      toast.error("Gagal menghapus recording.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Recording"
        description="Data recording dari WhatsApp dan input manual"
        action={
          <div className="flex items-center gap-2">
            <RecordingExportDialog />
            {canManage && <RecordingFormDialog onSaved={() => refetch()} />}
          </div>
        }
      />

      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as RecordingStatus | "ALL");
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="ALL">Semua</TabsTrigger>
          <TabsTrigger value="PERLU_REVIEW">Perlu Review</TabsTrigger>
          <TabsTrigger value="FINAL">Final</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : !data || data.recordings.length === 0 ? (
        <EmptyState message="Belum ada data recording." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <SortableTableHead
                  sortKey="goat"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Kambing
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
                  sortKey="birthDate"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Tanggal Lahir
                </SortableTableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Anak (J/B)</TableHead>
                <TableHead>Terjual</TableHead>
                <SortableTableHead
                  sortKey="source"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Sumber
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  currentKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((recording) => (
                <TableRow key={recording.id}>
                  <TableCell>
                    <RecordingPhotoPreview photoUrls={recording.photoUrls} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {recording.goat?.earTagNumber}
                  </TableCell>
                  <TableCell>{recording.goat?.farmer?.name}</TableCell>
                  <TableCell>{formatDateId(recording.birthDate)}</TableCell>
                  <TableCell>
                    <RecordingConditionBadge condition={recording.condition} />
                  </TableCell>
                  <TableCell>
                    {recording.maleKidCount} / {recording.femaleKidCount}
                  </TableCell>
                  <TableCell>
                    <RecordingSoldBadge sold={recording.sold} />
                  </TableCell>
                  <TableCell>
                    <RecordingSourceBadge source={recording.source} />
                  </TableCell>
                  <TableCell>
                    <RecordingStatusBadge status={recording.status} />
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <RecordingFormDialog
                          recording={recording}
                          onSaved={() => refetch()}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit"
                            >
                              <FiEdit2 className="size-3.5" />
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Hapus"
                            >
                              <FiTrash2 className="size-3.5 text-destructive" />
                            </Button>
                          }
                          title="Hapus Recording"
                          description="Yakin ingin menghapus recording ini?"
                          onConfirm={() => handleDelete(recording.id)}
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

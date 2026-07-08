"use client";

import { Suspense, useCallback, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
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
  RecordingSourceBadge,
  RecordingStatusBadge,
} from "@/features/recordings/components/recording-badges";
import { RecordingFormDialog } from "@/features/recordings/components/recording-form-dialog";
import { useAsync } from "@/hooks/use-async";
import { canManageData } from "@/lib/rbac";
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
        action={canManage && <RecordingFormDialog onSaved={() => refetch()} />}
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
                <TableHead>Kambing</TableHead>
                <TableHead>Peternak</TableHead>
                <TableHead>Tanggal Lahir</TableHead>
                <TableHead>Anak (J/B)</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recordings.map((recording) => (
                <TableRow key={recording.id}>
                  <TableCell>
                    {recording.photoUrl ? (
                      <Image
                        src={recording.photoUrl}
                        alt="Foto kambing"
                        width={40}
                        height={40}
                        className="rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded-md border border-dashed border-border" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {recording.goat?.earTagNumber}
                  </TableCell>
                  <TableCell>{recording.goat?.farmer?.name}</TableCell>
                  <TableCell>{recording.birthDate}</TableCell>
                  <TableCell>
                    {recording.maleKidCount} / {recording.femaleKidCount}
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

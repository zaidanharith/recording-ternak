"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiSend } from "react-icons/fi";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { RoleGuard } from "@/components/common/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/use-async";
import { useDebounce } from "@/hooks/use-debounce";
import {
  listNotReported,
  sendBulkReminder,
} from "@/services/follow-up.service";
import { sendFarmerReminder } from "@/services/farmer.service";

function FollowUpContent() {
  const [days, setDays] = useState(30);
  const debouncedDays = useDebounce(days, 500);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  const fetcher = useCallback(
    () => listNotReported(debouncedDays),
    [debouncedDays],
  );
  const { data, isLoading, refetch } = useAsync(fetcher);

  const handleSendOne = async (id: string, name: string) => {
    setSendingId(id);
    try {
      const message = await sendFarmerReminder(id);
      toast.success(message || `Reminder terkirim ke ${name}.`);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal mengirim reminder.";
      toast.error(message);
    } finally {
      setSendingId(null);
    }
  };

  const handleSendBulk = async () => {
    setIsSendingBulk(true);
    try {
      const result = await sendBulkReminder(debouncedDays);
      toast.success(
        `Reminder terkirim ke ${result.sentCount} peternak${
          result.failedCount > 0 ? `, ${result.failedCount} gagal` : ""
        }.`,
      );
      refetch();
    } catch {
      toast.error("Gagal mengirim reminder massal.");
    } finally {
      setIsSendingBulk(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Follow-up"
        description="Peternak yang belum melakukan recording dalam periode tertentu"
        action={
          <Button
            size="sm"
            disabled={isSendingBulk || !data || data.farmers.length === 0}
            onClick={handleSendBulk}
          >
            <FiSend className="size-4" />
            {isSendingBulk ? "Mengirim..." : "Kirim Reminder Massal"}
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Label htmlFor="days" className="text-sm text-muted-foreground">
          Belum lapor selama
        </Label>
        <Input
          id="days"
          type="number"
          min={1}
          value={days}
          onChange={(event) => setDays(Number(event.target.value) || 1)}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">hari</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.farmers.length === 0 ? (
        <EmptyState message="Semua peternak sudah melapor dalam periode ini." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Nomor WhatsApp</TableHead>
              <TableHead>Jumlah Kambing</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.farmers.map((farmer) => (
              <TableRow key={farmer.id}>
                <TableCell className="font-medium">{farmer.name}</TableCell>
                <TableCell>{farmer.whatsappPhone}</TableCell>
                <TableCell>{farmer.goats?.length ?? 0}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sendingId === farmer.id}
                    onClick={() => handleSendOne(farmer.id, farmer.name)}
                  >
                    <FiSend className="size-3.5" />
                    {sendingId === farmer.id ? "Mengirim..." : "Kirim"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function FollowUpPage() {
  return (
    <RoleGuard allow={["ADMIN", "SUPERADMIN"]}>
      <FollowUpContent />
    </RoleGuard>
  );
}

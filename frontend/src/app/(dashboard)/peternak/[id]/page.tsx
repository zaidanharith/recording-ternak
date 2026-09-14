"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiArrowLeft, FiEdit2, FiSend, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatHistory } from "@/features/chat/components/chat-history";
import { FarmerFormDialog } from "@/features/farmers/components/farmer-form-dialog";
import { BeritaAcaraDialog } from "@/features/goats/components/berita-acara-dialog";
import { useAsync } from "@/hooks/use-async";
import { canManageData } from "@/lib/rbac";
import {
  deleteFarmer,
  getFarmer,
  sendFarmerReminder,
} from "@/services/farmer.service";
import { useAuthStore } from "@/stores/auth.store";

export default function FarmerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const role = useAuthStore((state) => state.admin?.role);
  const canManage = canManageData(role);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const fetcher = useCallback(() => getFarmer(id), [id]);
  const { data: farmer, isLoading, refetch } = useAsync(fetcher);

  const handleDelete = async () => {
    try {
      await deleteFarmer(id);
      toast.success("Peternak berhasil dihapus.");
      router.push("/peternak");
    } catch {
      toast.error("Gagal menghapus peternak.");
    }
  };

  const handleReminder = async () => {
    setIsSendingReminder(true);
    try {
      const message = await sendFarmerReminder(id);
      toast.success(message || "Reminder terkirim.");
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal mengirim reminder.";
      toast.error(message);
    } finally {
      setIsSendingReminder(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!farmer) {
    return <EmptyState message="Peternak tidak ditemukan." />;
  }

  return (
    <div>
      <Link
        href="/peternak"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <FiArrowLeft className="size-4" />
        Kembali ke Peternak
      </Link>

      <PageHeader
        title={farmer.name}
        description={farmer.whatsappPhone}
        action={
          canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSendingReminder}
                onClick={handleReminder}
              >
                <FiSend className="size-4" />
                {isSendingReminder ? "Mengirim..." : "Kirim Reminder"}
              </Button>
              <FarmerFormDialog
                farmer={farmer}
                onSaved={() => refetch()}
                trigger={
                  <Button variant="outline" size="sm">
                    <FiEdit2 className="size-4" />
                    Edit
                  </Button>
                }
              />
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    <FiTrash2 className="size-4" />
                    Hapus
                  </Button>
                }
                title="Hapus Peternak"
                description={`Yakin ingin menghapus ${farmer.name}? Data kambing dan recording terkait juga akan terhapus.`}
                onConfirm={handleDelete}
              />
            </div>
          )
        }
      />

      <Card className="mb-6">
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Desa</p>
            <p className="text-sm font-medium">{farmer.desa}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dusun</p>
            <p className="text-sm font-medium">{farmer.dusun}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">RT/RW</p>
            <p className="text-sm font-medium">{farmer.rt}/{farmer.rw}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nomor WhatsApp</p>
            <p className="text-sm font-medium">{farmer.whatsappPhone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Jumlah Kambing</p>
            <p className="text-sm font-medium">{farmer.goats?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="kambing">
        <TabsList>
          <TabsTrigger value="kambing">Kambing</TabsTrigger>
          <TabsTrigger value="chat">Riwayat Chat WA</TabsTrigger>
        </TabsList>
        <TabsContent value="kambing" className="pt-4">
          {!farmer.goats || farmer.goats.length === 0 ? (
            <EmptyState message="Belum ada kambing terdaftar untuk peternak ini." />
          ) : (
            <div className="flex flex-col gap-2">
              {farmer.goats.map((goat) => (
                <div
                  key={goat.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-2 text-sm"
                >
                  <Link
                    href={`/kambing?farmerId=${farmer.id}`}
                    className="flex flex-1 items-center justify-between hover:underline"
                  >
                    <span className="font-medium">No. Telinga {goat.earTagNumber}</span>
                    <Badge variant="secondary" className="mr-2">
                      {new Date(goat.createdAt).toLocaleDateString("id-ID")}
                    </Badge>
                  </Link>
                  {canManage && <BeritaAcaraDialog goat={{ ...goat, farmerId: farmer.id }} />}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="chat" className="pt-4">
          <ChatHistory farmerId={farmer.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

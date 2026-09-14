"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiEdit2 } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  getPenyebabKematianOptions,
  updateLaporanKematian,
} from "@/services/kematian.service";
import type { LaporanKematian, PenyebabKematian } from "@/types/kematian";

const editSchema = z.object({
  tanggalKematian: z.string().min(1, "Tanggal kematian wajib diisi"),
  penyebabKematianId: z.string().min(1, "Penyebab kematian wajib dipilih"),
  catatan: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

interface LaporanKematianEditDialogProps {
  laporan: LaporanKematian;
  onSaved: (laporan: LaporanKematian) => void;
}

export function LaporanKematianEditDialog({ laporan, onSaved }: LaporanKematianEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [penyebabOptions, setPenyebabOptions] = useState<PenyebabKematian[]>([]);

  useEffect(() => {
    if (!open) return;
    getPenyebabKematianOptions()
      .then(setPenyebabOptions)
      .catch(() => toast.error("Gagal memuat daftar penyebab kematian."));
  }, [open]);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      tanggalKematian: laporan.tanggalKematian.slice(0, 10),
      penyebabKematianId: laporan.penyebabKematianId,
      catatan: laporan.catatan ?? "",
    },
  });

  const onSubmit = async (values: EditValues) => {
    try {
      const saved = await updateLaporanKematian(laporan.id, values);
      toast.success("Laporan kematian berhasil diperbarui.");
      onSaved(saved);
      setOpen(false);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal memperbarui laporan kematian.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Edit">
            <FiEdit2 className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Laporan Kematian</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="tanggalKematian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Tanggal Kematian</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="penyebabKematianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Penyebab Kematian</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih penyebab" />
                      </SelectTrigger>
                      <SelectContent>
                        {penyebabOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="catatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

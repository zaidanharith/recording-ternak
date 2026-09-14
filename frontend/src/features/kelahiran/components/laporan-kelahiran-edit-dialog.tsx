"use client";

import { useState } from "react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updateLaporanKelahiran } from "@/services/kelahiran.service";
import type { LaporanKelahiran } from "@/types/kelahiran";

const editSchema = z.object({
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  catatan: z.string().optional(),
  nomorAkta: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

interface LaporanKelahiranEditDialogProps {
  laporan: LaporanKelahiran;
  onSaved: (laporan: LaporanKelahiran) => void;
}

export function LaporanKelahiranEditDialog({ laporan, onSaved }: LaporanKelahiranEditDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      tanggalLahir: laporan.tanggalLahir.slice(0, 10),
      catatan: laporan.catatan ?? "",
      nomorAkta: laporan.nomorAkta ?? "",
    },
  });

  const onSubmit = async (values: EditValues) => {
    try {
      const saved = await updateLaporanKelahiran(laporan.id, values);
      toast.success("Laporan kelahiran berhasil diperbarui.");
      onSaved(saved);
      setOpen(false);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal memperbarui laporan kelahiran.";
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
          <DialogTitle>Edit Laporan Kelahiran</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="tanggalLahir"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Tanggal Lahir</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nomorAkta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Akta</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: 001" {...field} />
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

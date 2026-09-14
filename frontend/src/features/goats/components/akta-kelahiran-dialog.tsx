"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiSunrise } from "react-icons/fi";

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
import { GoatSelect } from "@/features/recordings/components/goat-select";
import { downloadBlob } from "@/lib/download-file";
import { generateAktaKelahiran } from "@/services/kelahiran.service";
import type { Goat } from "@/types/goat";

const aktaKelahiranSchema = z.object({
  goatId: z.string().min(1, "Kambing wajib dipilih"),
  jenisKelamin: z.enum(["JANTAN", "BETINA"], { message: "Jenis kelamin wajib dipilih" }),
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  rasRumpun: z.string().optional(),
  catatan: z.string().optional(),
  format: z.enum(["docx", "pdf"]),
});

type AktaKelahiranValues = z.infer<typeof aktaKelahiranSchema>;

interface AktaKelahiranDialogProps {
  goat?: Goat;
  onCreated?: () => void;
  trigger?: React.ReactElement;
}

export function AktaKelahiranDialog({ goat, onCreated, trigger }: AktaKelahiranDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<AktaKelahiranValues>({
    resolver: zodResolver(aktaKelahiranSchema),
    defaultValues: {
      goatId: goat?.id ?? "",
      jenisKelamin: undefined,
      tanggalLahir: "",
      rasRumpun: "",
      catatan: "",
      format: "docx",
    },
  });

  const onSubmit = async (values: AktaKelahiranValues) => {
    try {
      const blob = await generateAktaKelahiran(values.goatId, values);
      downloadBlob(blob, `akta-kelahiran-${goat?.earTagNumber ?? values.goatId}.${values.format}`);
      toast.success("Akta kelahiran berhasil dibuat.");
      setOpen(false);
      form.reset();
      onCreated?.();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal membuat akta kelahiran.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <FiSunrise className="size-4" />
              Akta Kelahiran
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Akta Kelahiran</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {!goat && (
              <FormField
                control={form.control}
                name="goatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Kambing</FormLabel>
                    <FormControl>
                      <GoatSelect value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="jenisKelamin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Jenis Kelamin</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as "JANTAN" | "BETINA")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JANTAN">Jantan</SelectItem>
                          <SelectItem value="BETINA">Betina</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
            <FormField
              control={form.control}
              name="rasRumpun"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ras/Rumpun</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Kambing Jawa" {...field} />
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
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format File</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="docx">Word (.docx)</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Membuat..." : "Generate & Unduh"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiFileText } from "react-icons/fi";

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
import { getGoat } from "@/services/goat.service";
import { generateBeritaAcara, getPenyebabKematianOptions } from "@/services/kematian.service";
import type { Goat } from "@/types/goat";
import type { PenyebabKematian } from "@/types/kematian";

const beritaAcaraSchema = z.object({
  goatId: z.string().min(1, "Kambing wajib dipilih"),
  tanggalKematian: z.string().min(1, "Tanggal kematian wajib diisi"),
  penyebabKematianId: z.string().min(1, "Penyebab kematian wajib dipilih"),
  catatan: z.string().optional(),
  jenisKelamin: z.enum(["JANTAN", "BETINA"]).optional(),
  tanggalLahir: z.string().optional(),
  rasRumpun: z.string().optional(),
  format: z.enum(["docx", "pdf"]),
});

type BeritaAcaraValues = z.infer<typeof beritaAcaraSchema>;

interface BeritaAcaraDialogProps {
  goat?: Goat;
  onCreated?: () => void;
  trigger?: React.ReactElement;
}

export function BeritaAcaraDialog({ goat, onCreated, trigger }: BeritaAcaraDialogProps) {
  const [open, setOpen] = useState(false);
  const [penyebabOptions, setPenyebabOptions] = useState<PenyebabKematian[]>([]);
  const [pickedGoat, setPickedGoat] = useState<Goat | null>(null);

  useEffect(() => {
    if (!open) return;
    getPenyebabKematianOptions()
      .then(setPenyebabOptions)
      .catch(() => toast.error("Gagal memuat daftar penyebab kematian."));
  }, [open]);

  const form = useForm<BeritaAcaraValues>({
    resolver: zodResolver(beritaAcaraSchema),
    defaultValues: {
      goatId: goat?.id ?? "",
      tanggalKematian: "",
      penyebabKematianId: "",
      catatan: "",
      jenisKelamin: undefined,
      tanggalLahir: "",
      rasRumpun: "",
      format: "docx",
    },
  });

  const goatId = form.watch("goatId");
  useEffect(() => {
    if (goat || !goatId) {
      setPickedGoat(null);
      return;
    }
    getGoat(goatId)
      .then(setPickedGoat)
      .catch(() => setPickedGoat(null));
  }, [goat, goatId]);

  const resolvedGoat = goat ?? pickedGoat;
  const needsJenisKelamin = !resolvedGoat?.jenisKelamin;
  const needsTanggalLahir = !resolvedGoat?.birthDate;
  const needsGoatDetails = needsJenisKelamin || needsTanggalLahir;

  const onSubmit = async (values: BeritaAcaraValues) => {
    let hasError = false;
    if (needsJenisKelamin && !values.jenisKelamin) {
      form.setError("jenisKelamin", { message: "Wajib diisi — kambing ini belum punya data jenis kelamin" });
      hasError = true;
    }
    if (needsTanggalLahir && !values.tanggalLahir) {
      form.setError("tanggalLahir", { message: "Wajib diisi — kambing ini belum punya data tanggal lahir" });
      hasError = true;
    }
    if (hasError) return;

    try {
      const blob = await generateBeritaAcara(values.goatId, values);
      downloadBlob(blob, `berita-acara-${resolvedGoat?.earTagNumber ?? values.goatId}.${values.format}`);
      toast.success("Berita acara berhasil dibuat.");
      setOpen(false);
      form.reset();
      setPickedGoat(null);
      onCreated?.();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal membuat berita acara kematian.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <FiFileText className="size-4" />
              Tambah Laporan Kematian
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Berita Acara Kematian</DialogTitle>
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
                        <SelectValue placeholder="Pilih penyebab">
                          {(current: string | null) =>
                            penyebabOptions.find((option) => option.id === current)?.nama ?? "Pilih penyebab"
                          }
                        </SelectValue>
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

            {needsGoatDetails && (
              <>
                <p className="text-xs text-muted-foreground">
                  Kambing ini belum punya data jenis kelamin/tanggal lahir tersimpan —
                  lengkapi di bawah ini sebelum melanjutkan.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="jenisKelamin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required={needsJenisKelamin}>Jenis Kelamin</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) =>
                              field.onChange(value as "JANTAN" | "BETINA")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih">
                                {(current: string | null) =>
                                  current === "JANTAN" ? "Jantan" : current === "BETINA" ? "Betina" : "Pilih"
                                }
                              </SelectValue>
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
                        <FormLabel required={needsTanggalLahir}>Tanggal Lahir</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rasRumpun"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ras/Rumpun</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format File</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(current: string | null) => (current === "pdf" ? "PDF" : "Word (.docx)")}
                          </SelectValue>
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
            </div>

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

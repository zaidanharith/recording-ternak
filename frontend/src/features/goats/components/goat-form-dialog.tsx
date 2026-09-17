"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiPlus } from "react-icons/fi";
import { subMonths, subYears } from "date-fns";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiPhotoUploadField, type PhotoValue } from "@/components/common/multi-photo-upload-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FarmerSelect } from "@/features/goats/components/farmer-select";
import { createGoat, getNextEarTagNumber, updateGoat } from "@/services/goat.service";
import type { Goat, GoatCondition } from "@/types/goat";

const optionalNumberString = z
  .string()
  .optional()
  .refine((value) => !value || /^\d+$/.test(value), "Harus berupa angka");

const goatSchema = z.object({
  earTagNumber: z
    .string()
    .min(1, "Nomor telinga wajib diisi")
    .regex(/^\d+$/, "Nomor telinga harus berupa angka bulat"),
  farmerId: z.string().min(1, "Peternak wajib dipilih"),
  registrationNumber: z.string().optional(),
  jenisKelamin: z.enum(["JANTAN", "BETINA"]).optional(),
  rasRumpun: z.string().optional(),
  birthDate: z.string().optional(),
  ageValue: optionalNumberString,
  ageUnit: z.enum(["bulan", "tahun"]).optional(),
  specialTraits: z.string().optional(),
  origin: z.string().optional(),
  enteredAt: z.string().optional(),
  purchasePrice: optionalNumberString,
  lengthCm: optionalNumberString,
  heightCm: optionalNumberString,
  lactationCount: optionalNumberString,
  initialCondition: z.enum(["SEHAT", "SAKIT"]).optional(),
});

type GoatValues = z.infer<typeof goatSchema>;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const estimateBirthDateFromAge = (ageValue: string, ageUnit: "bulan" | "tahun") => {
  const amount = Number(ageValue);
  const now = new Date();
  return toIsoDate(ageUnit === "bulan" ? subMonths(now, amount) : subYears(now, amount));
};

interface GoatFormDialogProps {
  goat?: Goat;
  defaultFarmerId?: string;
  onSaved: (goat: Goat) => void;
  trigger?: React.ReactElement;
}

export function GoatFormDialog({
  goat,
  defaultFarmerId,
  onSaved,
  trigger,
}: GoatFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [autoNumber, setAutoNumber] = useState(false);
  const [unknownBirthDate, setUnknownBirthDate] = useState(false);
  const [photos, setPhotos] = useState<PhotoValue[]>(() =>
    (goat?.photoUrls ?? []).map((url, index) => ({
      url,
      publicId: goat?.photoPublicIds?.[index] ?? url,
    })),
  );
  const isEdit = !!goat;

  const form = useForm<GoatValues>({
    resolver: zodResolver(goatSchema),
    defaultValues: {
      earTagNumber: goat ? String(goat.earTagNumber) : "",
      farmerId: goat?.farmerId ?? defaultFarmerId ?? "",
      registrationNumber: goat?.registrationNumber ?? "",
      jenisKelamin: goat?.jenisKelamin ?? undefined,
      rasRumpun: goat?.rasRumpun ?? "",
      birthDate: goat?.birthDate?.slice(0, 10) ?? "",
      ageValue: "",
      ageUnit: "bulan",
      specialTraits: goat?.specialTraits ?? "",
      origin: goat?.origin ?? "",
      enteredAt: goat?.enteredAt?.slice(0, 10) ?? "",
      purchasePrice: goat?.purchasePrice ? String(goat.purchasePrice) : "",
      lengthCm: goat?.lengthCm ? String(goat.lengthCm) : "",
      heightCm: goat?.heightCm ? String(goat.heightCm) : "",
      lactationCount: goat?.lactationCount ? String(goat.lactationCount) : "",
      initialCondition: goat?.initialCondition ?? undefined,
    },
  });

  const handleAutoToggle = async (checked: boolean) => {
    setAutoNumber(checked);
    if (checked) {
      try {
        const next = await getNextEarTagNumber();
        form.setValue("earTagNumber", String(next), { shouldValidate: true });
      } catch {
        toast.error("Gagal mengambil nomor telinga otomatis.");
        setAutoNumber(false);
      }
    }
  };

  const resetFormState = () => {
    form.reset();
    setAutoNumber(false);
    setUnknownBirthDate(false);
    setPhotos([]);
  };

  const onSubmit = async (values: GoatValues) => {
    try {
      const birthDate = unknownBirthDate
        ? values.ageValue
          ? estimateBirthDateFromAge(values.ageValue, values.ageUnit ?? "bulan")
          : undefined
        : values.birthDate || undefined;

      const input = {
        earTagNumber: Number(values.earTagNumber),
        farmerId: values.farmerId,
        registrationNumber: values.registrationNumber?.trim() || undefined,
        jenisKelamin: values.jenisKelamin,
        rasRumpun: values.rasRumpun?.trim() || undefined,
        birthDate,
        specialTraits: values.specialTraits?.trim() || undefined,
        origin: values.origin?.trim() || undefined,
        enteredAt: values.enteredAt || undefined,
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
        lengthCm: values.lengthCm ? Number(values.lengthCm) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        lactationCount: values.lactationCount ? Number(values.lactationCount) : undefined,
        initialCondition: values.initialCondition,
        photoUrls: photos.map((photo) => photo.url),
        photoPublicIds: photos.map((photo) => photo.publicId),
      };

      const saved = isEdit
        ? await updateGoat(goat.id, input)
        : await createGoat(input);
      toast.success(isEdit ? "Kambing berhasil diperbarui." : "Kambing berhasil ditambahkan.");
      onSaved(saved);
      setOpen(false);
      resetFormState();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal menyimpan data kambing.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <FiPlus className="size-4" />
              Tambah Kambing
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kambing" : "Tambah Kambing"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No. Registrasi</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: KMB-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="earTagNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nomor Telinga/Ternak</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} disabled={autoNumber} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-ear-tag"
                checked={autoNumber}
                onCheckedChange={(checked) => handleAutoToggle(checked === true)}
              />
              <Label htmlFor="auto-ear-tag" className="text-xs font-normal text-muted-foreground">
                Isi otomatis (nomor terbesar + 1)
              </Label>
            </div>
            <FormField
              control={form.control}
              name="farmerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Peternak</FormLabel>
                  <FormControl>
                    <FarmerSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="rasRumpun"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bangsa/Jenis</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Etawa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jenisKelamin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Kelamin</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as "JANTAN" | "BETINA")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih jenis kelamin">
                            {(current: string | null) =>
                              current === "JANTAN" ? "Jantan" : current === "BETINA" ? "Betina" : "Pilih jenis kelamin"
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
            </div>

            {unknownBirthDate ? (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="ageValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umur</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satuan</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bulan">Bulan</SelectItem>
                            <SelectItem value="tahun">Tahun</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="unknown-birth-date"
                checked={unknownBirthDate}
                onCheckedChange={(checked) => setUnknownBirthDate(checked === true)}
              />
              <Label htmlFor="unknown-birth-date" className="text-xs font-normal text-muted-foreground">
                Tidak tahu tanggal lahir, isi umur saja
              </Label>
            </div>

            <FormField
              control={form.control}
              name="specialTraits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciri Khusus</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asal Ternak</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enteredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Masuk Kandang</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli (Rp)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lactationCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Laktasi Ke</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lengthCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Panjang (cm)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tinggi (cm)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="initialCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kondisi Awal Masuk Kandang</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as GoatCondition)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kondisi">
                          {(current: string | null) =>
                            current === "SEHAT" ? "Sehat" : current === "SAKIT" ? "Sakit" : "Pilih kondisi"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEHAT">Sehat</SelectItem>
                        <SelectItem value="SAKIT">Sakit</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Dokumentasi</p>
              <MultiPhotoUploadField photos={photos} onChange={setPhotos} />
            </div>

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

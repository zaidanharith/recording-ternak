"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiPlus } from "react-icons/fi";

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
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { whatsappPhoneSchema } from "@/lib/validation";
import { createFarmer, updateFarmer } from "@/services/farmer.service";
import type { Farmer } from "@/types/farmer";

const DESA_TETAP = "Besuki";
const DUSUN_PRESETS = ["Besuki", "Tumpuk"] as const;
type DusunOption = (typeof DUSUN_PRESETS)[number] | "Lainnya";

const resolveDusunOption = (dusun?: string): DusunOption => {
  if (dusun === "Besuki" || dusun === "Tumpuk") return dusun;
  if (!dusun || dusun === "-") return "Besuki";
  return "Lainnya";
};

const resolveDusunCustomValue = (dusun?: string): string => {
  if (!dusun || dusun === "-" || dusun === "Besuki" || dusun === "Tumpuk") return "";
  return dusun;
};

const stripPlaceholder = (value?: string): string => (!value || value === "-" ? "" : value);

const farmerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  dusun: z.string().optional(),
  rt: z.string().optional(),
  rw: z.string().optional(),
  whatsappPhone: whatsappPhoneSchema,
});

type FarmerValues = z.infer<typeof farmerSchema>;

interface FarmerFormDialogProps {
  farmer?: Farmer;
  onSaved: (farmer: Farmer) => void;
  trigger?: React.ReactElement;
}

export function FarmerFormDialog({ farmer, onSaved, trigger }: FarmerFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!farmer;
  const [dusunOption, setDusunOption] = useState<DusunOption>(() =>
    resolveDusunOption(farmer?.dusun),
  );

  const form = useForm<FarmerValues>({
    resolver: zodResolver(farmerSchema),
    defaultValues: {
      name: farmer?.name ?? "",
      dusun:
        resolveDusunOption(farmer?.dusun) === "Lainnya"
          ? resolveDusunCustomValue(farmer?.dusun)
          : resolveDusunOption(farmer?.dusun),
      rt: stripPlaceholder(farmer?.rt),
      rw: stripPlaceholder(farmer?.rw),
      whatsappPhone: farmer?.whatsappPhone ?? "",
    },
  });

  const handleDusunOptionChange = (value: DusunOption | null) => {
    if (!value) return;
    setDusunOption(value);
    form.setValue(
      "dusun",
      value === "Lainnya" ? resolveDusunCustomValue(farmer?.dusun) : value,
      { shouldDirty: true },
    );
  };

  const onSubmit = async (values: FarmerValues) => {
    if (dusunOption === "Lainnya" && !values.dusun?.trim()) {
      toast.error("Nama dusun wajib diisi.");
      return;
    }

    try {
      const payload = { ...values, desa: DESA_TETAP };
      const saved = isEdit
        ? await updateFarmer(farmer.id, payload)
        : await createFarmer(payload);
      toast.success(isEdit ? "Peternak berhasil diperbarui." : "Peternak berhasil ditambahkan.");
      onSaved(saved);
      setOpen(false);
      form.reset();
      setDusunOption(resolveDusunOption(farmer?.dusun));
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal menyimpan data peternak.";
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
              Tambah Peternak
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Peternak" : "Tambah Peternak"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nama</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsappPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nomor WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="62812xxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-2">
              <Label>Desa</Label>
              <Input value={DESA_TETAP} disabled readOnly />
            </div>
            <div className="grid gap-2">
              <Label>Dusun</Label>
              <Select value={dusunOption} onValueChange={handleDusunOptionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DUSUN_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset}
                    </SelectItem>
                  ))}
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dusunOption === "Lainnya" && (
              <FormField
                control={form.control}
                name="dusun"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Nama Dusun</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Krajan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RT</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: 005" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RW</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: 002" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

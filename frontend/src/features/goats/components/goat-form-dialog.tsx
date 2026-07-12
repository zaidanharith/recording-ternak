"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { FiPlus } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { FarmerSelect } from "@/features/goats/components/farmer-select";
import { createGoat, getNextEarTagNumber, updateGoat } from "@/services/goat.service";
import type { Goat } from "@/types/goat";

const goatSchema = z.object({
  earTagNumber: z
    .string()
    .min(1, "Nomor telinga wajib diisi")
    .regex(/^\d+$/, "Nomor telinga harus berupa angka bulat"),
  farmerId: z.string().min(1, "Peternak wajib dipilih"),
});

type GoatValues = z.infer<typeof goatSchema>;

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
  const isEdit = !!goat;

  const form = useForm<GoatValues>({
    resolver: zodResolver(goatSchema),
    defaultValues: {
      earTagNumber: goat ? String(goat.earTagNumber) : "",
      farmerId: goat?.farmerId ?? defaultFarmerId ?? "",
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

  const onSubmit = async (values: GoatValues) => {
    try {
      const input = { ...values, earTagNumber: Number(values.earTagNumber) };
      const saved = isEdit
        ? await updateGoat(goat.id, input)
        : await createGoat(input);
      toast.success(isEdit ? "Kambing berhasil diperbarui." : "Kambing berhasil ditambahkan.");
      onSaved(saved);
      setOpen(false);
      form.reset();
      setAutoNumber(false);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kambing" : "Tambah Kambing"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="earTagNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nomor Telinga</FormLabel>
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

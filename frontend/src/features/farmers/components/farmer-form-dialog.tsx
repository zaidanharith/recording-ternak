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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { whatsappPhoneSchema } from "@/lib/validation";
import { createFarmer, updateFarmer } from "@/services/farmer.service";
import type { Farmer } from "@/types/farmer";

const farmerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  address: z.string().optional(),
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

  const form = useForm<FarmerValues>({
    resolver: zodResolver(farmerSchema),
    defaultValues: {
      name: farmer?.name ?? "",
      address: farmer?.address ?? "",
      whatsappPhone: farmer?.whatsappPhone ?? "",
    },
  });

  const onSubmit = async (values: FarmerValues) => {
    try {
      const saved = isEdit
        ? await updateFarmer(farmer.id, values)
        : await createFarmer(values);
      toast.success(isEdit ? "Peternak berhasil diperbarui." : "Peternak berhasil ditambahkan.");
      onSaved(saved);
      setOpen(false);
      form.reset();
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
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Input {...field} />
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

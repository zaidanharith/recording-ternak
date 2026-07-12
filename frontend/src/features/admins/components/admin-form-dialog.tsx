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
import { assignableAdminRoleSchema } from "@/lib/validation";
import { createAdmin, updateAdmin } from "@/services/admin.service";
import type { Admin } from "@/types/admin";

const baseAdminSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  role: assignableAdminRoleSchema,
});

type AdminValues = z.infer<typeof baseAdminSchema>;

interface AdminFormDialogProps {
  admin?: Admin;
  onSaved: (admin: Admin) => void;
  trigger?: React.ReactElement;
}

export function AdminFormDialog({ admin, onSaved, trigger }: AdminFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!admin;
  const schema = isEdit
    ? baseAdminSchema
    : baseAdminSchema.extend({
        password: z.string().min(8, "Password minimal 8 karakter"),
      });

  const form = useForm<AdminValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: admin?.username ?? "",
      email: admin?.email ?? "",
      password: "",
      name: admin?.name ?? "",
      role: (admin?.role === "SUPERADMIN" ? "ADMIN" : admin?.role) ?? "ADMIN",
    },
  });

  const onSubmit = async (values: AdminValues) => {
    try {
      const saved = isEdit
        ? await updateAdmin(admin.id, {
            username: values.username,
            email: values.email,
            name: values.name,
            role: values.role,
          })
        : await createAdmin({ ...values, password: values.password ?? "" });

      toast.success(isEdit ? "Akun berhasil diperbarui." : "Akun berhasil dibuat.");
      onSaved(saved);
      setOpen(false);
      form.reset();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal menyimpan akun.";
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
              Tambah Akun
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Akun" : "Tambah Akun"}</DialogTitle>
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
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Role</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange((value ?? "ADMIN") as "ADMIN" | "VIEWER")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin (Petugas)</SelectItem>
                        <SelectItem value="VIEWER">Viewer (Stakeholder)</SelectItem>
                      </SelectContent>
                    </Select>
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

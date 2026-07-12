"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { canManageData } from "@/lib/rbac";
import { updateMe } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

const profileSchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi"),
    avatarUrl: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .refine(
    (values) => !values.newPassword || values.newPassword.length >= 8,
    { message: "Password baru minimal 8 karakter", path: ["newPassword"] },
  )
  .refine((values) => !values.newPassword || !!values.currentPassword, {
    message: "Password saat ini wajib diisi untuk mengubah password",
    path: ["currentPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const admin = useAuthStore((state) => state.admin);
  const updateAdmin = useAuthStore((state) => state.updateAdmin);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: admin?.name ?? "",
      avatarUrl: admin?.avatarUrl ?? "",
      currentPassword: "",
      newPassword: "",
    },
  });

  if (!admin) return null;

  const onSubmit = async (values: ProfileValues) => {
    try {
      const payload: Record<string, string> = {};
      if (values.name !== admin.name) payload.name = values.name;
      if (values.avatarUrl && values.avatarUrl !== admin.avatarUrl) {
        payload.avatarUrl = values.avatarUrl;
      }
      if (values.newPassword) {
        payload.newPassword = values.newPassword;
        payload.currentPassword = values.currentPassword ?? "";
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Tidak ada perubahan untuk disimpan.");
        return;
      }

      const updated = await updateMe(payload);
      updateAdmin(updated);
      form.reset({
        name: updated.name,
        avatarUrl: updated.avatarUrl ?? "",
        currentPassword: "",
        newPassword: "",
      });
      toast.success("Profil berhasil diperbarui.");
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal memperbarui profil.";
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-5"
      >
        <AvatarUpload
          name={admin.name}
          currentUrl={form.watch("avatarUrl") || null}
          editable={canManageData(admin.role)}
          onUploaded={(url) =>
            form.setValue("avatarUrl", url, { shouldDirty: true })
          }
        />

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

        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-sm font-medium text-foreground">{admin.email}</p>
        </div>

        <Separator />

        <p className="text-sm font-medium text-foreground">Ubah Password</p>

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password Saat Ini</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password Baru</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>Kosongkan jika tidak ingin mengubah password.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-fit">
          {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </form>
    </Form>
  );
}

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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoatSelect } from "@/features/recordings/components/goat-select";
import { PhotoUploadField } from "@/features/recordings/components/photo-upload-field";
import {
  createRecording,
  updateRecording,
} from "@/services/recording.service";
import type { Recording, RecordingStatus } from "@/types/recording";

const recordingSchema = z.object({
  goatId: z.string().min(1, "Kambing wajib dipilih"),
  matingDate: z.string().optional(),
  birthDate: z.string().optional(),
  maleKidCount: z.string().optional(),
  femaleKidCount: z.string().optional(),
  matingNumber: z.string().optional(),
  saleTarget: z.string().optional(),
  sold: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PERLU_REVIEW", "FINAL"]).optional(),
});

type RecordingValues = z.infer<typeof recordingSchema>;

interface RecordingFormDialogProps {
  recording?: Recording;
  defaultGoatId?: string;
  onSaved: (recording: Recording) => void;
  trigger?: React.ReactElement;
}

export function RecordingFormDialog({
  recording,
  defaultGoatId,
  onSaved,
  trigger,
}: RecordingFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(recording?.photoUrl ?? "");
  const [photoPublicId, setPhotoPublicId] = useState(recording?.photoPublicId ?? "");
  const isEdit = !!recording;

  const form = useForm<RecordingValues>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      goatId: recording?.goatId ?? defaultGoatId ?? "",
      matingDate: recording?.matingDate ?? "",
      birthDate: recording?.birthDate ?? "",
      maleKidCount: recording?.maleKidCount ?? "",
      femaleKidCount: recording?.femaleKidCount ?? "",
      matingNumber: recording?.matingNumber ?? "",
      saleTarget: recording?.saleTarget ?? "",
      sold: recording?.sold ?? "",
      notes: recording?.notes ?? "",
      status: recording?.status,
    },
  });

  const onSubmit = async (values: RecordingValues) => {
    try {
      const payload = {
        ...values,
        photoUrl: photoUrl || undefined,
        photoPublicId: photoPublicId || undefined,
      };

      const saved = isEdit
        ? await updateRecording(recording.id, payload)
        : await createRecording(payload);

      toast.success(isEdit ? "Recording berhasil diperbarui." : "Recording berhasil ditambahkan.");
      onSaved(saved);
      setOpen(false);
      form.reset();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? (error.response.data.message as string)
          : "Gagal menyimpan recording.";
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
              Tambah Recording
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit / Review Recording" : "Tambah Recording"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="goatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kambing</FormLabel>
                  <FormControl>
                    <GoatSelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="matingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Kawin</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maleKidCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Anak Jantan</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="femaleKidCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Anak Betina</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="matingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perkawinan Ke</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="saleTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Jual</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Terjual</FormLabel>
                    <FormControl>
                      <Input placeholder="Ya / Belum" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as RecordingStatus)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERLU_REVIEW">Perlu Review</SelectItem>
                          <SelectItem value="FINAL">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Foto Kondisi Kambing</p>
              <PhotoUploadField
                photoUrl={photoUrl}
                onChange={(result) => {
                  setPhotoUrl(result.photoUrl);
                  setPhotoPublicId(result.photoPublicId);
                }}
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

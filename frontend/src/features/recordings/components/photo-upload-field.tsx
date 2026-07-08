"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FiUpload, FiX } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadPhoto } from "@/services/uploads.service";

interface PhotoUploadFieldProps {
  photoUrl: string;
  onChange: (result: { photoUrl: string; photoPublicId: string }) => void;
}

export function PhotoUploadField({ photoUrl, onChange }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadPhoto(file);
      onChange({ photoUrl: result.url, photoPublicId: result.publicId });
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {photoUrl && (
        <div className="relative w-fit">
          <Image
            src={photoUrl}
            alt="Foto kambing"
            width={120}
            height={120}
            className="rounded-lg border border-border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            className="absolute -right-2 -top-2 rounded-full"
            aria-label="Hapus foto"
            onClick={() => onChange({ photoUrl: "", photoPublicId: "" })}
          >
            <FiX className="size-3" />
          </Button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <FiUpload className="size-4" />
        {isUploading ? "Mengunggah..." : photoUrl ? "Ganti Foto" : "Unggah Foto"}
      </Button>
    </div>
  );
}

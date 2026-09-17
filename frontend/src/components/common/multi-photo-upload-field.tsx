"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FiUpload, FiX } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadPhoto } from "@/services/uploads.service";

export interface PhotoValue {
  url: string;
  publicId: string;
}

interface MultiPhotoUploadFieldProps {
  photos: PhotoValue[];
  onChange: (photos: PhotoValue[]) => void;
}

export function MultiPhotoUploadField({ photos, onChange }: MultiPhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const result = await uploadPhoto(file);
          return { url: result.url, publicId: result.publicId };
        }),
      );
      onChange([...photos, ...uploaded]);
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = (publicId: string) => {
    onChange(photos.filter((photo) => photo.publicId !== publicId));
  };

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.publicId} className="relative w-fit">
              <Image
                src={photo.url}
                alt="Foto"
                width={100}
                height={100}
                className="rounded-lg border border-border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute -right-2 -top-2 rounded-full"
                aria-label="Hapus foto"
                onClick={() => handleRemove(photo.publicId)}
              >
                <FiX className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
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
        {isUploading ? "Mengunggah..." : "Unggah Foto"}
      </Button>
    </div>
  );
}

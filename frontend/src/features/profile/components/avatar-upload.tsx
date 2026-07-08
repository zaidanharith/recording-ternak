"use client";

import { useRef, useState } from "react";
import { FiUpload } from "react-icons/fi";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadPhoto } from "@/services/uploads.service";

interface AvatarUploadProps {
  name: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  editable?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AvatarUpload({
  name,
  currentUrl,
  onUploaded,
  editable = true,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadPhoto(file);
      onUploaded(result.url);
      toast.success("Foto berhasil diunggah.");
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        <AvatarImage src={currentUrl ?? undefined} alt={name} />
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      {editable && (
        <div>
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
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <FiUpload className="size-4" />
            {isUploading ? "Mengunggah..." : "Ganti Foto"}
          </Button>
        </div>
      )}
    </div>
  );
}

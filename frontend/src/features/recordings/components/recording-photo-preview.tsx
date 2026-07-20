"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RecordingPhotoPreviewProps {
  photoUrl?: string | null;
}

export function RecordingPhotoPreview({ photoUrl }: RecordingPhotoPreviewProps) {
  if (!photoUrl) {
    return <div className="size-10 rounded-md border border-dashed border-border" />;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="block cursor-zoom-in" aria-label="Perbesar foto kambing">
            <Image
              src={photoUrl}
              alt="Foto kambing"
              width={40}
              height={40}
              className="rounded-md border border-border object-cover"
            />
          </button>
        }
      />
      <DialogContent className="w-fit max-w-[calc(100%-2rem)] p-2" showCloseButton>
        <DialogTitle className="sr-only">Foto Kambing</DialogTitle>
        <Image
          src={photoUrl}
          alt="Foto kambing"
          width={0}
          height={0}
          sizes="100vw"
          className="h-auto max-h-[80vh] w-auto max-w-[85vw] rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

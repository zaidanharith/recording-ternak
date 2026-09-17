"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RecordingPhotoPreviewProps {
  photoUrls?: string[] | null;
}

export function RecordingPhotoPreview({ photoUrls }: RecordingPhotoPreviewProps) {
  const urls = photoUrls ?? [];
  if (urls.length === 0) {
    return <div className="size-10 rounded-md border border-dashed border-border" />;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="relative block cursor-zoom-in" aria-label="Perbesar foto kambing">
            <Image
              src={urls[0]}
              alt="Foto kambing"
              width={40}
              height={40}
              className="rounded-md border border-border object-cover"
            />
            {urls.length > 1 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {urls.length}
              </span>
            )}
          </button>
        }
      />
      <DialogContent className="w-fit max-w-[calc(100%-2rem)] p-2" showCloseButton>
        <DialogTitle className="sr-only">Foto Kambing</DialogTitle>
        <div className="flex max-h-[80vh] flex-wrap gap-2 overflow-y-auto">
          {urls.map((url) => (
            <Image
              key={url}
              src={url}
              alt="Foto kambing"
              width={0}
              height={0}
              sizes="100vw"
              className="h-auto max-h-[75vh] w-auto max-w-[85vw] rounded-lg object-contain"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

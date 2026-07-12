"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type ExportFormat = "xlsx" | "pdf";

interface ExportDialogProps {
  title: string;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  isExporting: boolean;
  onExport: () => Promise<boolean>;
  children: React.ReactNode;
}

export function ExportDialog({
  title,
  format,
  onFormatChange,
  isExporting,
  onExport,
  children,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    const success = await onExport();
    if (success) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FiDownload className="size-4" />
            Export
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => onFormatChange(value as ExportFormat)}
              className="flex flex-row gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="xlsx" />
                Excel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="pdf" />
                PDF
              </label>
            </RadioGroup>
          </div>
          {children}
        </div>
        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Memproses..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

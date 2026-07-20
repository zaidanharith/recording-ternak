"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ExportDialog, type ExportFormat } from "@/components/common/export-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadBlob } from "@/lib/download-file";
import { exportFarmers } from "@/services/farmer.service";
import type { ExportFarmersQuery } from "@/types/farmer";

type SortBy = NonNullable<ExportFarmersQuery["sortBy"]>;
type SortDir = NonNullable<ExportFarmersQuery["sortDir"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "name", label: "Nama" },
  { value: "whatsappPhone", label: "Nomor WhatsApp" },
  { value: "desa", label: "Desa" },
];

export function FarmerExportDialog() {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await exportFarmers({
        format,
        search: search || undefined,
        sortBy,
        sortDir,
      });
      downloadBlob(blob, `peternak-${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success("Peternak berhasil diekspor.");
      return true;
    } catch {
      toast.error("Gagal mengekspor data peternak.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportDialog
      title="Export Peternak"
      format={format}
      onFormatChange={setFormat}
      isExporting={isExporting}
      onExport={handleExport}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Cari Nama atau Nomor WhatsApp</Label>
          <Input
            placeholder="Cari nama atau nomor WhatsApp..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Urutkan Berdasarkan</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Arah Urutan</Label>
            <Select value={sortDir} onValueChange={(value) => setSortDir(value as SortDir)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Naik</SelectItem>
                <SelectItem value="desc">Turun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </ExportDialog>
  );
}

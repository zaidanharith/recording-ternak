"use client";

import { useCallback, useState } from "react";
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
import { useAsync } from "@/hooks/use-async";
import { downloadBlob } from "@/lib/download-file";
import { exportGoats } from "@/services/goat.service";
import { listFarmers } from "@/services/farmer.service";
import type { ExportGoatsQuery } from "@/types/goat";

type SortBy = NonNullable<ExportGoatsQuery["sortBy"]>;
type SortDir = NonNullable<ExportGoatsQuery["sortDir"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "createdAt", label: "Terdaftar" },
  { value: "earTagNumber", label: "No. Telinga" },
  { value: "farmer", label: "Peternak" },
];

export function GoatExportDialog() {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [farmerId, setFarmerId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isExporting, setIsExporting] = useState(false);

  const farmersFetcher = useCallback(() => listFarmers({ page: 1, limit: 1000 }), []);
  const { data: farmersData } = useAsync(farmersFetcher);

  const handleExport = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await exportGoats({
        format,
        farmerId: farmerId === "ALL" ? undefined : farmerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDir,
      });
      downloadBlob(blob, `kambing-${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success("Kambing berhasil diekspor.");
      return true;
    } catch {
      toast.error("Gagal mengekspor data kambing.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportDialog
      title="Export Kambing"
      format={format}
      onFormatChange={setFormat}
      isExporting={isExporting}
      onExport={handleExport}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Peternak</Label>
          <Select value={farmerId} onValueChange={(value) => setFarmerId(value ?? "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(current: string | null) =>
                  farmersData?.farmers.find((farmer) => farmer.id === current)?.name ?? "Semua Peternak"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Peternak</SelectItem>
              {farmersData?.farmers.map((farmer) => (
                <SelectItem key={farmer.id} value={farmer.id}>
                  {farmer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Dari Tanggal</Label>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sampai Tanggal</Label>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Urutkan Berdasarkan</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(current: string | null) =>
                  SORT_OPTIONS.find((option) => option.value === current)?.label ?? "Pilih"
                }
              </SelectValue>
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
              <SelectValue>{(current: string | null) => (current === "desc" ? "Turun" : "Naik")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Naik</SelectItem>
              <SelectItem value="desc">Turun</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ExportDialog>
  );
}

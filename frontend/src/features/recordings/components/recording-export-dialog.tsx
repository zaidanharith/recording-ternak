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
import { exportRecordings } from "@/services/recording.service";
import type {
  ExportRecordingsQuery,
  GoatCondition,
  RecordingSource,
  RecordingStatus,
  SoldStatus,
} from "@/types/recording";

type SortBy = NonNullable<ExportRecordingsQuery["sortBy"]>;
type SortDir = NonNullable<ExportRecordingsQuery["sortDir"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "birthDate", label: "Tanggal Lahir" },
  { value: "goat", label: "Kambing" },
  { value: "farmer", label: "Peternak" },
  { value: "source", label: "Sumber" },
  { value: "status", label: "Status" },
];

const STATUS_LABELS: Record<string, string> = { ALL: "Semua", PERLU_REVIEW: "Perlu Review", FINAL: "Final" };
const SOLD_LABELS: Record<string, string> = { ALL: "Semua", YA: "Ya", TIDAK: "Tidak" };
const CONDITION_LABELS: Record<string, string> = { ALL: "Semua", SEHAT: "Sehat", SAKIT: "Sakit" };
const SOURCE_LABELS: Record<string, string> = { ALL: "Semua", WA: "WhatsApp", MANUAL: "Manual" };

export function RecordingExportDialog() {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [status, setStatus] = useState<RecordingStatus | "ALL">("ALL");
  const [sold, setSold] = useState<SoldStatus | "ALL">("ALL");
  const [condition, setCondition] = useState<GoatCondition | "ALL">("ALL");
  const [source, setSource] = useState<RecordingSource | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("birthDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (): Promise<boolean> => {
    setIsExporting(true);
    try {
      const blob = await exportRecordings({
        format,
        status: status === "ALL" ? undefined : status,
        sold: sold === "ALL" ? undefined : sold,
        condition: condition === "ALL" ? undefined : condition,
        source: source === "ALL" ? undefined : source,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDir,
      });
      downloadBlob(blob, `recording-${new Date().toISOString().slice(0, 10)}.${format}`);
      toast.success("Recording berhasil diekspor.");
      return true;
    } catch {
      toast.error("Gagal mengekspor data recording.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ExportDialog
      title="Export Recording"
      format={format}
      onFormatChange={setFormat}
      isExporting={isExporting}
      onExport={handleExport}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as RecordingStatus | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue>{(current: string | null) => STATUS_LABELS[current ?? "ALL"] ?? "Semua"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="PERLU_REVIEW">Perlu Review</SelectItem>
              <SelectItem value="FINAL">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Terjual</Label>
          <Select value={sold} onValueChange={(value) => setSold(value as SoldStatus | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue>{(current: string | null) => SOLD_LABELS[current ?? "ALL"] ?? "Semua"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="YA">Ya</SelectItem>
              <SelectItem value="TIDAK">Tidak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Kondisi</Label>
          <Select value={condition} onValueChange={(value) => setCondition(value as GoatCondition | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue>{(current: string | null) => CONDITION_LABELS[current ?? "ALL"] ?? "Semua"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="SEHAT">Sehat</SelectItem>
              <SelectItem value="SAKIT">Sakit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sumber</Label>
          <Select value={source} onValueChange={(value) => setSource(value as RecordingSource | "ALL")}>
            <SelectTrigger className="w-full">
              <SelectValue>{(current: string | null) => SOURCE_LABELS[current ?? "ALL"] ?? "Semua"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="WA">WhatsApp</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
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

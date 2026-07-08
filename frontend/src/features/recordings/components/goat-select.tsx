"use client";

import { useCallback } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/use-async";
import { listGoats } from "@/services/goat.service";

interface GoatSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GoatSelect({ value, onChange, disabled }: GoatSelectProps) {
  const fetcher = useCallback(() => listGoats({ page: 1, limit: 200 }), []);
  const { data, isLoading } = useAsync(fetcher);

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next ?? "")}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Memuat..." : "Pilih kambing"} />
      </SelectTrigger>
      <SelectContent>
        {data?.goats.map((goat) => (
          <SelectItem key={goat.id} value={goat.id}>
            No. {goat.earTagNumber} — {goat.farmer?.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

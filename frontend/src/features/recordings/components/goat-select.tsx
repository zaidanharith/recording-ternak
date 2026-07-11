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
import type { Goat } from "@/types/goat";

interface GoatSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function goatLabel(goat: Goat) {
  return `No. ${goat.earTagNumber} — ${goat.farmer?.name}`;
}

export function GoatSelect({ value, onChange, disabled }: GoatSelectProps) {
  const fetcher = useCallback(() => listGoats({ page: 1, limit: 200 }), []);
  const { data, isLoading } = useAsync(fetcher);
  const placeholder = isLoading ? "Memuat..." : "Pilih kambing";

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next ?? "")}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {(current: string | null) => {
            const goat = data?.goats.find((item) => item.id === current);
            return goat ? goatLabel(goat) : placeholder;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {data?.goats.map((goat) => (
          <SelectItem key={goat.id} value={goat.id}>
            {goatLabel(goat)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

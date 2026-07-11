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
import { listFarmers } from "@/services/farmer.service";
import type { Farmer } from "@/types/farmer";

interface FarmerSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function farmerLabel(farmer: Farmer) {
  return `${farmer.name} — ${farmer.whatsappPhone}`;
}

export function FarmerSelect({ value, onChange, disabled }: FarmerSelectProps) {
  const fetcher = useCallback(
    () => listFarmers({ page: 1, limit: 200 }),
    [],
  );
  const { data, isLoading } = useAsync(fetcher);
  const placeholder = isLoading ? "Memuat..." : "Pilih peternak";

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next ?? "")}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {(current: string | null) => {
            const farmer = data?.farmers.find((item) => item.id === current);
            return farmer ? farmerLabel(farmer) : placeholder;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {data?.farmers.map((farmer) => (
          <SelectItem key={farmer.id} value={farmer.id}>
            {farmerLabel(farmer)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

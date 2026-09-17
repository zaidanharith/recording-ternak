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

interface FarmerSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
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
            return farmer?.name ?? placeholder;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {data?.farmers.map((farmer) => (
          <SelectItem key={farmer.id} value={farmer.id}>
            {farmer.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

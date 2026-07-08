"use client";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/common";

interface PaginationBarProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ meta, onPageChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted-foreground">
        Halaman {meta.page} dari {totalPages} ({meta.total} data)
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <FiChevronLeft className="size-4" />
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Berikutnya
          <FiChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

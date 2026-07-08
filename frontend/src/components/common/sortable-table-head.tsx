"use client";

import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  sortKey: string;
  currentKey: string | null;
  currentDirection: "asc" | "desc" | null;
  onSort: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function SortableTableHead({
  sortKey,
  currentKey,
  currentDirection,
  onSort,
  className,
  children,
}: SortableTableHeadProps) {
  const isActive = currentKey === sortKey;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-left font-medium text-foreground"
      >
        {children}
        <span className="flex flex-col -space-y-1">
          <FiChevronUp
            className={cn(
              "size-3",
              isActive && currentDirection === "asc"
                ? "text-foreground"
                : "text-muted-foreground/40",
            )}
          />
          <FiChevronDown
            className={cn(
              "size-3",
              isActive && currentDirection === "desc"
                ? "text-foreground"
                : "text-muted-foreground/40",
            )}
          />
        </span>
      </button>
    </TableHead>
  );
}

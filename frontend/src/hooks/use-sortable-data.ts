"use client";

import { useMemo, useState } from "react";

type SortDirection = "asc" | "desc" | null;
type Accessor<T> = (item: T) => string | number | null | undefined;

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: "asc" | "desc",
): number {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  let result: number;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b), "id-ID");
  }

  return direction === "asc" ? result : -result;
}

export function useSortableData<T>(
  data: T[],
  accessors: Record<string, Accessor<T>>,
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
      return;
    }

    setSortDirection("asc");
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    const accessor = accessors[sortKey];
    if (!accessor) return data;

    return [...data].sort((itemA, itemB) =>
      compareValues(accessor(itemA), accessor(itemB), sortDirection),
    );
  }, [data, sortKey, sortDirection, accessors]);

  return { sortedData, sortKey, sortDirection, toggleSort };
}

"use client";

import { useEffect, useState } from "react";

interface UseAsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: unknown;
}

export function useAsync<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, isLoading: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const refetch = () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    return fetcher()
      .then((data) => setState({ data, isLoading: false, error: null }))
      .catch((error) => setState({ data: null, isLoading: false, error }));
  };

  return { ...state, refetch };
}

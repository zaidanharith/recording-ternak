"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth.store";

export function AuthHydrator() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}

"use client";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    router.replace("/");
  };
}

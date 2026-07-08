import { create } from "zustand";

import type { Admin } from "@/types/admin";

const TOKEN_KEY = "rt_token";
const ADMIN_KEY = "rt_admin";

interface AuthState {
  admin: Admin | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  updateAdmin: (admin: Admin) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  admin: null,
  token: null,
  isHydrated: false,

  setAuth: (token, admin) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    set({ token, admin });
  },

  updateAdmin: (admin) => {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    set({ admin });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    set({ token: null, admin: null });
  },

  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const adminRaw = localStorage.getItem(ADMIN_KEY);
    set({
      token,
      admin: adminRaw ? (JSON.parse(adminRaw) as Admin) : null,
      isHydrated: true,
    });
  },
}));

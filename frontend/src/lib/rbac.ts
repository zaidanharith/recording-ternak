import type { AdminRole } from "@/types/admin";

export function canManageData(role: AdminRole | undefined): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function isSuperAdmin(role: AdminRole | undefined): boolean {
  return role === "SUPERADMIN";
}

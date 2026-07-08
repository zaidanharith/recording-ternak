import {
  FiBell,
  FiClipboard,
  FiHome,
  FiSettings,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import type { AdminRole } from "@/types/admin";

export interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  roles?: AdminRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Ringkasan", href: "/dashboard", icon: FiHome },
  { label: "Peternak", href: "/peternak", icon: FiUsers },
  { label: "Kambing", href: "/kambing", icon: FiTag },
  { label: "Recording", href: "/recording", icon: FiClipboard },
  {
    label: "Follow-up",
    href: "/follow-up",
    icon: FiBell,
    roles: ["ADMIN", "SUPERADMIN"],
  },
  { label: "Pengaturan", href: "/pengaturan", icon: FiSettings },
];

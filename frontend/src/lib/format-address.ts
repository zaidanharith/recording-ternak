import type { Farmer } from "@/types/farmer";

export function formatFarmerAddress(farmer: Pick<Farmer, "desa" | "dukuh" | "rt" | "rw">): string {
  const parts = [farmer.dukuh, farmer.desa].filter((part) => part && part !== "-");

  const rtRw = [farmer.rt, farmer.rw].filter((part) => part && part !== "-");
  if (rtRw.length > 0) {
    parts.push(`RT ${farmer.rt !== "-" ? farmer.rt : "-"}/RW ${farmer.rw !== "-" ? farmer.rw : "-"}`);
  }

  return parts.length > 0 ? parts.join(", ") : "-";
}

import type { Goat } from "@/types/goat";

export interface Farmer {
  id: string;
  name: string;
  desa: string;
  dukuh: string;
  rt: string;
  rw: string;
  whatsappPhone: string;
  createdAt: string;
  updatedAt: string;
  goats?: Goat[];
}

export interface CreateFarmerInput {
  name: string;
  desa?: string;
  dukuh?: string;
  rt?: string;
  rw?: string;
  whatsappPhone: string;
}

export interface UpdateFarmerInput {
  name?: string;
  desa?: string;
  dukuh?: string;
  rt?: string;
  rw?: string;
  whatsappPhone?: string;
}

export interface ListFarmersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ExportFarmersQuery {
  format: "xlsx" | "pdf";
  search?: string;
  sortBy?: "name" | "whatsappPhone" | "desa";
  sortDir?: "asc" | "desc";
}

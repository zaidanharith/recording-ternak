import type { Goat } from "@/types/goat";

export interface Farmer {
  id: string;
  name: string;
  address: string;
  whatsappPhone: string;
  createdAt: string;
  updatedAt: string;
  goats?: Goat[];
}

export interface CreateFarmerInput {
  name: string;
  address?: string;
  whatsappPhone: string;
}

export interface UpdateFarmerInput {
  name?: string;
  address?: string;
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
  sortBy?: "name" | "whatsappPhone" | "address";
  sortDir?: "asc" | "desc";
}

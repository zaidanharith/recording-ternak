import type { Farmer } from "@/types/farmer";
import type { Recording } from "@/types/recording";

export type GoatCondition = "SEHAT" | "SAKIT";

export interface Goat {
  id: string;
  earTagNumber: number;
  registrationNumber: string | null;
  farmerId: string;
  jenisKelamin: "JANTAN" | "BETINA" | null;
  rasRumpun: string | null;
  birthDate: string | null;
  specialTraits: string | null;
  origin: string | null;
  enteredAt: string | null;
  purchasePrice: number | null;
  lengthCm: number | null;
  heightCm: number | null;
  lactationCount: number | null;
  initialCondition: GoatCondition | null;
  photoUrls: string[];
  photoPublicIds: string[];
  status: "HIDUP" | "MATI";
  createdAt: string;
  updatedAt: string;
  farmer?: Farmer;
  recordings?: Recording[];
}

export interface GoatDetailFields {
  registrationNumber?: string;
  jenisKelamin?: "JANTAN" | "BETINA";
  rasRumpun?: string;
  birthDate?: string;
  specialTraits?: string;
  origin?: string;
  enteredAt?: string;
  purchasePrice?: number;
  lengthCm?: number;
  heightCm?: number;
  lactationCount?: number;
  initialCondition?: GoatCondition;
  photoUrls?: string[];
  photoPublicIds?: string[];
}

export interface CreateGoatInput extends GoatDetailFields {
  earTagNumber: number;
  farmerId: string;
}

export interface UpdateGoatInput extends GoatDetailFields {
  earTagNumber?: number;
  farmerId?: string;
}

export interface ListGoatsQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
  search?: string;
}

export interface ExportGoatsQuery {
  format: "xlsx" | "pdf";
  farmerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "earTagNumber" | "farmer" | "createdAt";
  sortDir?: "asc" | "desc";
}

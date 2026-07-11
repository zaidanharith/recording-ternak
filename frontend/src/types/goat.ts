import type { Farmer } from "@/types/farmer";
import type { Recording } from "@/types/recording";

export interface Goat {
  id: string;
  earTagNumber: number;
  farmerId: string;
  createdAt: string;
  updatedAt: string;
  farmer?: Farmer;
  recordings?: Recording[];
}

export interface CreateGoatInput {
  earTagNumber: number;
  farmerId: string;
}

export interface UpdateGoatInput {
  earTagNumber?: number;
  farmerId?: string;
}

export interface ListGoatsQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
}

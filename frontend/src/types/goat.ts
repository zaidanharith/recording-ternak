import type { Farmer } from "@/types/farmer";
import type { Recording } from "@/types/recording";

export interface Goat {
  id: string;
  earTagNumber: string;
  farmerId: string;
  createdAt: string;
  updatedAt: string;
  farmer?: Farmer;
  recordings?: Recording[];
}

export interface CreateGoatInput {
  earTagNumber: string;
  farmerId: string;
}

export interface UpdateGoatInput {
  earTagNumber?: string;
  farmerId?: string;
}

export interface ListGoatsQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
}

import type { Goat } from "@/types/goat";

export type RecordingStatus = "PERLU_REVIEW" | "FINAL";
export type RecordingSource = "WA" | "MANUAL";

export interface Recording {
  id: string;
  goatId: string;
  goat?: Goat;
  senderName: string;
  matingDate: string;
  birthDate: string;
  maleKidCount: string;
  femaleKidCount: string;
  matingNumber: string;
  saleTarget: string;
  sold: string;
  notes: string;
  status: RecordingStatus;
  source: RecordingSource;
  photoUrl: string | null;
  photoPublicId: string | null;
  createdAt: string;
}

export interface CreateRecordingInput {
  goatId: string;
  matingDate?: string;
  birthDate?: string;
  maleKidCount?: string;
  femaleKidCount?: string;
  matingNumber?: string;
  saleTarget?: string;
  sold?: string;
  notes?: string;
  photoUrl?: string;
  photoPublicId?: string;
}

export interface UpdateRecordingInput {
  matingDate?: string;
  birthDate?: string;
  maleKidCount?: string;
  femaleKidCount?: string;
  matingNumber?: string;
  saleTarget?: string;
  sold?: string;
  notes?: string;
  photoUrl?: string;
  photoPublicId?: string;
  status?: RecordingStatus;
}

export interface ListRecordingsQuery {
  page?: number;
  limit?: number;
  status?: RecordingStatus;
  goatId?: string;
  farmerId?: string;
}

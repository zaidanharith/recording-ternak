import { api } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/common";
import type {
  CreateGoatInput,
  Goat,
  ListGoatsQuery,
  UpdateGoatInput,
} from "@/types/goat";

export async function listGoats(
  query: ListGoatsQuery = {},
): Promise<{ goats: Goat[]; meta: PaginationMeta }> {
  const { data } = await api.get<
    ApiResponse<{ goats: Goat[]; meta: PaginationMeta }>
  >("/goats", { params: query });
  return data.data!;
}

export async function getGoat(id: string): Promise<Goat> {
  const { data } =
    await api.get<ApiResponse<{ goat: Goat }>>(`/goats/${id}`);
  return data.data!.goat;
}

export async function getNextEarTagNumber(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ nextEarTagNumber: number }>>(
    "/goats/next-ear-tag",
  );
  return data.data!.nextEarTagNumber;
}

export async function createGoat(input: CreateGoatInput): Promise<Goat> {
  const { data } = await api.post<ApiResponse<{ goat: Goat }>>(
    "/goats",
    input,
  );
  return data.data!.goat;
}

export async function updateGoat(
  id: string,
  input: UpdateGoatInput,
): Promise<Goat> {
  const { data } = await api.patch<ApiResponse<{ goat: Goat }>>(
    `/goats/${id}`,
    input,
  );
  return data.data!.goat;
}

export async function deleteGoat(id: string): Promise<void> {
  await api.delete(`/goats/${id}`);
}

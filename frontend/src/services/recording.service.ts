import { api } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/common";
import type {
  CreateRecordingInput,
  ListRecordingsQuery,
  Recording,
  UpdateRecordingInput,
} from "@/types/recording";

export async function listRecordings(
  query: ListRecordingsQuery = {},
): Promise<{ recordings: Recording[]; meta: PaginationMeta }> {
  const { data } = await api.get<
    ApiResponse<{ recordings: Recording[]; meta: PaginationMeta }>
  >("/recordings", { params: query });
  return data.data!;
}

export async function getRecording(id: string): Promise<Recording> {
  const { data } = await api.get<ApiResponse<{ recording: Recording }>>(
    `/recordings/${id}`,
  );
  return data.data!.recording;
}

export async function createRecording(
  input: CreateRecordingInput,
): Promise<Recording> {
  const { data } = await api.post<ApiResponse<{ recording: Recording }>>(
    "/recordings",
    input,
  );
  return data.data!.recording;
}

export async function updateRecording(
  id: string,
  input: UpdateRecordingInput,
): Promise<Recording> {
  const { data } = await api.patch<ApiResponse<{ recording: Recording }>>(
    `/recordings/${id}`,
    input,
  );
  return data.data!.recording;
}

export async function deleteRecording(id: string): Promise<void> {
  await api.delete(`/recordings/${id}`);
}

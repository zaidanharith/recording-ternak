import { api } from "@/lib/axios";
import type { AuthResult, GoogleLoginInput, LoginInput } from "@/types/auth";
import type { Admin, UpdateProfileInput } from "@/types/admin";
import type { ApiResponse } from "@/types/common";

export async function login(input: LoginInput): Promise<AuthResult> {
  const { data } = await api.post<ApiResponse<AuthResult>>(
    "/auth/login",
    input,
  );
  return data.data as AuthResult;
}

export async function googleLogin(
  input: GoogleLoginInput,
): Promise<AuthResult> {
  const { data } = await api.post<ApiResponse<AuthResult>>(
    "/auth/google",
    input,
  );
  return data.data as AuthResult;
}

export async function getMe(): Promise<Admin> {
  const { data } =
    await api.get<ApiResponse<{ admin: Admin }>>("/auth/me");
  return data.data!.admin;
}

export async function updateMe(input: UpdateProfileInput): Promise<Admin> {
  const { data } = await api.patch<ApiResponse<{ admin: Admin }>>(
    "/auth/me",
    input,
  );
  return data.data!.admin;
}

import type { Admin } from "@/types/admin";

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
}

export interface AuthResult {
  token: string;
  admin: Admin;
}

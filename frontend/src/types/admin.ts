export type AdminRole = "ADMIN" | "SUPERADMIN" | "VIEWER";

export interface Admin {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  googleId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminInput {
  username: string;
  email: string;
  password: string;
  name: string;
  role: Exclude<AdminRole, "SUPERADMIN">;
  avatarUrl?: string;
}

export interface UpdateAdminInput {
  username?: string;
  email?: string;
  name?: string;
  role?: Exclude<AdminRole, "SUPERADMIN">;
  avatarUrl?: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

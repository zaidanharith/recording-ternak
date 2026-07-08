import { z } from "zod";

export const whatsappPhoneSchema = z
  .string()
  .min(8, "Nomor WhatsApp minimal 8 digit")
  .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh berisi angka dan tanda +");

export const assignableAdminRoleSchema = z.enum(["ADMIN", "VIEWER"]);

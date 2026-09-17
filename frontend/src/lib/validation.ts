import { z } from "zod";

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const normalizeWhatsappPhone = (value: string) => {
  const digits = digitsOnly(value);
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
};

export const whatsappPhoneSchema = z
  .string()
  .min(9, "Nomor WhatsApp minimal 9 digit")
  .regex(/^62\d+$/, "Nomor WhatsApp harus diawali 62");

export const assignableAdminRoleSchema = z.enum(["ADMIN", "VIEWER"]);

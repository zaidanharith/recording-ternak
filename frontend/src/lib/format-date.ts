export function formatDateId(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}

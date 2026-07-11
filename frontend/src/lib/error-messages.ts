export interface ErrorMeta {
  title: string;
  description: string;
}

export const ERROR_CODE_META: Record<string, ErrorMeta> = {
  "400": {
    title: "Permintaan Tidak Valid",
    description: "Permintaan yang Anda kirim tidak dapat diproses.",
  },
  "401": {
    title: "Tidak Terautentikasi",
    description: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  },
  "403": {
    title: "Akses Ditolak",
    description: "Anda tidak memiliki izin untuk mengakses halaman ini.",
  },
  "404": {
    title: "Halaman Tidak Ditemukan",
    description: "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
  },
  "500": {
    title: "Terjadi Kesalahan Server",
    description: "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
  },
  "503": {
    title: "Layanan Tidak Tersedia",
    description: "Layanan sedang tidak tersedia. Silakan coba lagi nanti.",
  },
};

export const DEFAULT_ERROR_META: ErrorMeta = {
  title: "Terjadi Kesalahan",
  description: "Terjadi kesalahan yang tidak terduga.",
};

export function getErrorMeta(code: string): ErrorMeta {
  return ERROR_CODE_META[code] ?? DEFAULT_ERROR_META;
}

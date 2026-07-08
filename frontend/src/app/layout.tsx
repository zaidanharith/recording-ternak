import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "../styles/globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/common/providers";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Recording Ternak",
  description: "Aplikasi Recording Ternak",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans", notoSans.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

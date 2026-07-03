import type { Metadata } from "next";
import { Noto_Sans, Geist } from "next/font/google";
import "../styles/globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("antialiased", "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}

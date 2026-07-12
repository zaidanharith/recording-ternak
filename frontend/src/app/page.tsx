"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { useAuthStore } from "@/stores/auth.store";

export default function Home() {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (isHydrated && token) {
      router.replace("/dashboard");
    }
  }, [isHydrated, token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Image
            src="/logo-bumdes.png"
            alt="Logo Bumdes Sumber Abadi"
            width={72}
            height={72}
            className="mx-auto mb-4"
          />
          <h1 className="text-lg font-semibold text-foreground">
            Recording Ternak
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk mengelola data recording ternak
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Layanan oleh Bumdes Sumber Abadi Desa Besuki
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

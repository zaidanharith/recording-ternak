"use client";

import { useEffect } from "react";

import { ErrorPage } from "@/components/common/error-page";
import { Button } from "@/components/ui/button";
import { ERROR_CODE_META } from "@/lib/error-messages";
import "../styles/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const meta = ERROR_CODE_META["500"];

  return (
    <html lang="id">
      <body className="antialiased">
        <ErrorPage
          code={500}
          title={meta.title}
          description={meta.description}
          actions={<Button onClick={reset}>Coba Lagi</Button>}
        />
      </body>
    </html>
  );
}

import Link from "next/link";

import { ErrorPage } from "@/components/common/error-page";
import { Button } from "@/components/ui/button";
import { getErrorMeta } from "@/lib/error-messages";

interface ErrorCodePageProps {
  params: Promise<{ code: string }>;
}

export default async function ErrorCodePage({ params }: ErrorCodePageProps) {
  const { code } = await params;
  const meta = getErrorMeta(code);

  return (
    <ErrorPage
      code={code}
      title={meta.title}
      description={meta.description}
      actions={
        <>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Ke Halaman Masuk
          </Button>
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Kembali ke Dashboard
          </Button>
        </>
      }
    />
  );
}

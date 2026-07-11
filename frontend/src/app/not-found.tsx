import Link from "next/link";

import { ErrorPage } from "@/components/common/error-page";
import { Button } from "@/components/ui/button";
import { ERROR_CODE_META } from "@/lib/error-messages";

export default function NotFound() {
  const meta = ERROR_CODE_META["404"];

  return (
    <ErrorPage
      code={404}
      title={meta.title}
      description={meta.description}
      actions={
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          Kembali ke Dashboard
        </Button>
      }
    />
  );
}

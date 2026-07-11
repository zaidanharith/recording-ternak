import type { ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";

interface ErrorPageProps {
  code: number | string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ErrorPage({ code, title, description, actions }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FiAlertTriangle className="size-7" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        Error {code}
      </span>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actions && <div className="mt-2 flex items-center gap-3">{actions}</div>}
    </div>
  );
}

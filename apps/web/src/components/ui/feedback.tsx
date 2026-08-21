import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "./cn";

export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded bg-black/10", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: Readonly<{
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn("grid gap-3 border border-dashed border-line p-6", className)}>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {description ? (
        <p className="max-w-prose text-sm leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: Readonly<{
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}>) {
  return (
    <section
      className={cn("grid gap-3 border border-red-200 bg-red-50 p-6", className)}
      role="alert"
    >
      <h2 className="text-lg font-bold text-red-900">{title}</h2>
      {description ? (
        <p className="max-w-prose text-sm leading-6 text-red-800">{description}</p>
      ) : null}
      {onRetry ? (
        <div>
          <Button size="sm" tone="danger" onClick={onRetry} type="button">
            Try again
          </Button>
        </div>
      ) : null}
    </section>
  );
}

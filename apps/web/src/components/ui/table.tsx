import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { cn } from "./cn";

export function Table({
  className,
  wrapperClassName,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-x-auto rounded-md border border-admin-border",
        wrapperClassName,
      )}
    >
      <table
        className={cn(
          "w-full min-w-[42rem] border-collapse text-left text-[13px] text-admin-text-secondary",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-admin-border bg-admin-surface-subtle text-[11px] uppercase tracking-[0.08em] text-admin-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-admin-border", className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-3 align-middle", className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-3 py-2.5 font-semibold", className)} scope="col" {...props} />;
}

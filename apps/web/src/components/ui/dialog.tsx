"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "./cn";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  variant = "default",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "admin";
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={cn(
        variant === "admin"
          ? "rounded-lg border border-admin-border bg-admin-surface p-0 text-admin-text-primary shadow-[0_20px_60px_rgb(29_36_33/18%)] backdrop:bg-admin-text-primary/30"
          : "rounded border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-black/40",
        className ?? "m-auto w-11/12 max-w-lg",
      )}
      onClose={() => {
        if (open) onClose();
      }}
      ref={dialogRef}
    >
      <div
        className={cn("grid max-h-full gap-5 overflow-y-auto p-6", variant === "admin" && "p-5")}
      >
        <header className="grid gap-1">
          <div className="flex items-start justify-between gap-3">
            <h2
              className={cn("text-lg font-bold", variant === "admin" && "text-base font-semibold")}
              id={titleId}
            >
              {title}
            </h2>
            <button
              aria-label={`Close ${title}`}
              className={cn(
                "grid size-8 shrink-0 place-items-center text-muted hover:bg-black/5 hover:text-ink focus-visible:outline-2",
                variant === "admin"
                  ? "rounded-md text-admin-text-muted hover:bg-admin-surface-hover hover:text-admin-text-primary focus-visible:outline-admin-accent"
                  : "rounded-full focus-visible:outline-deep",
              )}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
          {description ? (
            <p
              className={cn(
                "text-sm leading-6 text-muted",
                variant === "admin" && "text-admin-text-secondary",
              )}
            >
              {description}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </dialog>
  );
}

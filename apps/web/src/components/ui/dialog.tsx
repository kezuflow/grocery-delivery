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
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
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
        "rounded border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-black/40",
        className ?? "m-auto w-11/12 max-w-lg",
      )}
      onClose={() => {
        if (open) onClose();
      }}
      ref={dialogRef}
    >
      <div className="grid max-h-full gap-5 overflow-y-auto p-6">
        <header className="grid gap-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold" id={titleId}>
              {title}
            </h2>
            <button
              aria-label={`Close ${title}`}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-deep"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
          {description ? <p className="text-sm leading-6 text-muted">{description}</p> : null}
        </header>
        {children}
      </div>
    </dialog>
  );
}

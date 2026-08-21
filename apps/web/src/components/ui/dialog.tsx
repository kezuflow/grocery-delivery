"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

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
        "m-auto w-[min(100%-2rem,32rem)] rounded border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-black/40",
        className,
      )}
      onClose={() => {
        if (open) onClose();
      }}
      ref={dialogRef}
    >
      <div className="grid gap-5 p-6">
        <header className="grid gap-1">
          <h2 className="text-lg font-bold" id={titleId}>
            {title}
          </h2>
          {description ? <p className="text-sm leading-6 text-muted">{description}</p> : null}
        </header>
        {children}
      </div>
    </dialog>
  );
}

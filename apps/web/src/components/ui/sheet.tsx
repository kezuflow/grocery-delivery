"use client";

import type { ReactNode } from "react";

import { Dialog } from "./dialog";

export function Sheet({
  open,
  onClose,
  title,
  children,
  variant = "default",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: "default" | "admin";
}>) {
  return (
    <Dialog
      className="m-0 ml-auto h-full max-h-full w-full max-w-2xl overflow-hidden rounded-none border-y-0 border-r-0"
      onClose={onClose}
      open={open}
      title={title}
      variant={variant}
    >
      {children}
    </Dialog>
  );
}

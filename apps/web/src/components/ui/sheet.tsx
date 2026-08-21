"use client";

import type { ReactNode } from "react";

import { Dialog } from "./dialog";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}>) {
  return (
    <Dialog
      className="m-0 ml-auto min-h-full w-[min(100%-1rem,28rem)] rounded-none border-y-0 border-r-0"
      onClose={onClose}
      open={open}
      title={title}
    >
      {children}
    </Dialog>
  );
}

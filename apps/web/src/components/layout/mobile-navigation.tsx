"use client";

import { useState } from "react";

import { Button, Sheet } from "../ui";
import type { NavigationItem } from "./navigation";

export function MobileNavigation({ items }: Readonly<{ items: readonly NavigationItem[] }>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button aria-expanded={open} onClick={() => setOpen(true)} size="sm" tone="secondary">
        Menu
      </Button>
      <Sheet onClose={() => setOpen(false)} open={open} title="Navigation">
        <nav aria-label="Mobile navigation">
          <ul className="grid gap-2">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  className="block rounded px-3 py-3 font-bold text-ink hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </div>
  );
}

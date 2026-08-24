"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sheet } from "../ui";
import type { NavigationItem } from "./navigation";

const groups = ["Workspace", "Operations", "Manage"] as const;

export function MobileNavigation({ items }: Readonly<{ items: readonly NavigationItem[] }>) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-label="Open navigation"
        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-admin-border bg-admin-surface px-3 text-xs font-semibold text-admin-text-primary shadow-sm transition-colors hover:bg-admin-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu aria-hidden="true" size={15} />
        Menu
      </button>
      <Sheet onClose={() => setOpen(false)} open={open} title="Navigation">
        <nav aria-label="Mobile navigation">
          <div className="grid gap-5">
            {groups.map((group) => {
              const groupItems = items.filter((item) => item.group === group);
              if (!groupItems.length) return null;
              return (
                <section className="grid gap-1" key={group}>
                  <h3 className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
                    {group}
                  </h3>
                  <ul className="grid gap-1">
                    {groupItems.map((item) => {
                      const active =
                        item.href === "/admin"
                          ? pathname === item.href
                          : pathname.startsWith(item.href);
                      return (
                        <li key={item.href}>
                          <a
                            aria-current={active ? "page" : undefined}
                            className={`block rounded-md border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent ${
                              active
                                ? "border-admin-border bg-admin-surface-hover text-admin-text-primary"
                                : "border-transparent text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text-primary"
                            }`}
                            href={item.href}
                            onClick={() => setOpen(false)}
                          >
                            {item.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </nav>
      </Sheet>
    </div>
  );
}

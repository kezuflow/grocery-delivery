"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  ContactRound,
  Gift,
  Headphones,
  LayoutDashboard,
  PackageCheck,
  Settings2,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "../ui/cn";
import type { NavigationItem } from "./navigation";

const groups = ["Workspace", "Operations", "Manage"] as const;

export function AdminNavigation({ items }: Readonly<{ items: readonly NavigationItem[] }>) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="px-3 py-4" id="admin-navigation">
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (!groupItems.length) return null;
        return (
          <div className="mb-5 last:mb-0" key={group}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
              {group}
            </p>
            <ul className="grid gap-0.5">
              {groupItems.map((item) => {
                const active =
                  item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <a
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center gap-2 rounded-md border border-transparent px-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent",
                        active
                          ? "border-admin-border bg-admin-surface-hover text-admin-text-primary shadow-[0_1px_0_rgb(29_36_33/4%)]"
                          : "text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text-primary",
                      )}
                      href={item.href}
                    >
                      <NavigationIcon href={item.href} />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NavigationIcon({ href }: Readonly<{ href: string }>) {
  const props = { "aria-hidden": true, size: 15, strokeWidth: 1.8 } as const;
  if (href === "/admin/catalog") return <Boxes {...props} />;
  if (href === "/admin/orders") return <ShoppingCart {...props} />;
  if (href === "/admin/procurement") return <ClipboardList {...props} />;
  if (href === "/admin/packing") return <PackageCheck {...props} />;
  if (href === "/admin/dispatch") return <Truck {...props} />;
  if (href === "/admin/support") return <Headphones {...props} />;
  if (href === "/admin/customers") return <ContactRound {...props} />;
  if (href === "/admin/promotions") return <Gift {...props} />;
  if (href === "/admin/reporting") return <BarChart3 {...props} />;
  if (href === "/admin/staff") return <Users {...props} />;
  if (href === "/admin/configuration") return <Settings2 {...props} />;
  return <LayoutDashboard {...props} />;
}

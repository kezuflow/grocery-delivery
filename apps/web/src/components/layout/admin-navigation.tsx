"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
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
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">
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
                        "flex min-h-8 items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                        active
                          ? "bg-[#ededed] text-[#171717]"
                          : "text-[#5f5f5f] hover:bg-[#f1f1f1] hover:text-[#171717]",
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
  if (href === "/admin/promotions") return <Gift {...props} />;
  if (href === "/admin/reporting") return <BarChart3 {...props} />;
  if (href === "/admin/staff") return <Users {...props} />;
  if (href === "/admin/configuration") return <Settings2 {...props} />;
  return <LayoutDashboard {...props} />;
}

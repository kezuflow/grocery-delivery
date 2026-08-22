import type { ReactNode } from "react";
import { Home, ListOrdered, ShoppingBag, UserRound } from "lucide-react";

import type { SessionSummary } from "../../lib/permissions";
import { AccountMenu } from "./account-menu";
import { BrandLink } from "./brand-link";
import { OnlineStatus } from "./online-status";

const customerLinks = [
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/account/orders", label: "Orders", icon: ListOrdered },
  { href: "/account", label: "Account", icon: UserRound },
] as const;

export function MarketplaceShell({
  session,
  children,
}: Readonly<{ session: SessionSummary; children: ReactNode }>) {
  return (
    <main className="marketplace-shell min-h-screen bg-market-paper text-market-ink pb-24 lg:pb-0">
      <OnlineStatus />
      <header className="border-b border-market-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[76px] lg:px-8">
          <BrandLink />
          <nav
            aria-label="Marketplace navigation"
            className="hidden items-center gap-7 text-sm font-semibold text-market-muted lg:flex"
          >
            <a className="text-market-ink" href="/shop">
              Shop
            </a>
            <a href="/account/orders">Orders</a>
            <a href="/account">Account</a>
          </nav>
          <AccountMenu session={session} />
        </div>
      </header>
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      <nav
        aria-label="Customer navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-market-line bg-white/95 px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-market-green"
              href="/shop"
            >
              <Home aria-hidden="true" size={20} strokeWidth={2.2} />
              Shop
            </a>
          </li>
          {customerLinks.slice(1).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a
                className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-market-muted"
                href={href}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2} />
                {label}
              </a>
            </li>
          ))}
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-market-muted"
              href="/account/cart"
            >
              <ShoppingBag aria-hidden="true" size={20} strokeWidth={2} />
              Cart
            </a>
          </li>
        </ul>
      </nav>
    </main>
  );
}

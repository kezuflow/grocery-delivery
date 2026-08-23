import type { ReactNode } from "react";
import {
  ClipboardList,
  Heart,
  Home,
  Menu,
  Search,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";

import type { SessionSummary } from "../../lib/permissions";
import { AccountMenu } from "./account-menu";
import { OnlineStatus } from "./online-status";

export function MarketplaceShell({
  session,
  search = "",
  children,
}: Readonly<{ session: SessionSummary | null; search?: string; children: ReactNode }>) {
  const showCustomerNavigation = session?.role === "customer";
  const cartHref = showCustomerNavigation ? "/account/cart" : "/shop";

  return (
    <main className="marketplace-shell min-h-screen bg-white text-market-ink pb-24 lg:pb-0">
      <OnlineStatus />
      <header className="border-b border-market-line bg-white">
        <div className="hidden h-[68px] items-center gap-7 px-6 lg:flex xl:px-10">
          <a className="flex items-center gap-2 text-lg font-black" href="/shop">
            <span className="grid size-9 place-items-center rounded-full bg-market-green-dark text-sm text-white">
              C
            </span>
            Carbon Market
          </a>
          <form action="/shop" className="flex h-11 min-w-0 max-w-[640px] flex-1" role="search">
            <label className="sr-only" htmlFor="header-search">
              Search Carbon Market
            </label>
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="absolute left-4 text-market-muted" size={17} />
              <input
                className="h-full w-full rounded-full bg-[#f5f5f5] pl-11 pr-4 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-market-green"
                defaultValue={search}
                id="header-search"
                name="search"
                placeholder="Search Carbon Market"
              />
            </div>
          </form>
          <button className="ml-auto flex items-center gap-2 text-left text-xs" type="button">
            <span className="grid size-8 place-items-center rounded-full bg-market-soft text-market-green-dark">
              <Store size={16} />
            </span>
            <span>
              <strong className="block">Deliver to</strong>
              <span className="text-market-muted">Manila · This week</span>
            </span>
          </button>
          <a
            aria-label="Your cart"
            className="grid size-10 place-items-center rounded-full hover:bg-market-soft"
            href={cartHref}
          >
            <ShoppingBag size={19} />
          </a>
          {session ? (
            <AccountMenu session={session} />
          ) : (
            <a className="text-sm font-bold" href="/shop">
              Sign in
            </a>
          )}
        </div>
        <div className="bg-market-green-dark px-4 pb-4 pt-4 lg:hidden">
          <div className="mx-auto max-w-md">
            <div className="mb-3 flex items-center justify-between text-white">
              <a className="flex items-center gap-2" href="/shop">
                <span className="grid size-8 place-items-center rounded-full bg-white text-sm font-black text-market-green-dark">
                  C
                </span>
                <span>
                  <strong className="block text-sm">Carbon Market</strong>
                  <small className="text-[10px] text-white/75">Weekly grocery delivery</small>
                </span>
              </a>
              <div className="flex items-center gap-3">
                <a aria-label="Your cart" href={cartHref}>
                  <ShoppingBag size={20} />
                </a>
                <Menu aria-hidden="true" size={21} />
              </div>
            </div>
            <form action="/shop" className="relative" role="search">
              <label className="sr-only" htmlFor="mobile-market-search">
                Search products
              </label>
              <input
                className="h-11 w-full rounded-full border-0 bg-white px-4 pr-11 text-sm text-market-ink outline-none placeholder:text-market-muted"
                defaultValue={search}
                id="mobile-market-search"
                name="search"
                placeholder="Search fruits, vegetables, dairy..."
                type="search"
              />
              <button
                aria-label="Search products"
                className="absolute right-2 top-1 grid size-9 place-items-center text-market-green-dark"
                type="submit"
              >
                <Search size={22} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="grid w-full lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[216px_minmax(0,1fr)]">
        <aside className="hidden border-r border-market-line bg-white lg:block">
          <div className="sticky top-0 px-4 py-6">
            <div className="mb-6 border-b border-market-line pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-market-muted">
                Browse
              </p>
              <p className="mt-2 text-base font-bold">Carbon Market</p>
              <p className="mt-1 text-xs leading-5 text-market-muted">
                Fresh groceries for your weekly box
              </p>
            </div>
            <nav aria-label="Marketplace categories" className="grid gap-1 text-sm">
              <a
                className="flex items-center gap-3 rounded-md bg-market-soft px-3 py-2.5 font-bold text-market-green-dark"
                href="/shop"
              >
                <Home size={17} /> Grocery
              </a>
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-market-muted hover:bg-market-soft"
                href="/shop?category=fresh-produce"
              >
                <Store size={17} /> Fresh produce
              </a>
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-market-muted hover:bg-market-soft"
                href="/shop?category=fresh-herbs"
              >
                <Heart size={17} /> Fresh herbs
              </a>
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-market-muted hover:bg-market-soft"
                href="/shop"
              >
                <ClipboardList size={17} /> Weekly offers
              </a>
            </nav>
            <div className="mt-8 border-t border-market-line pt-5">
              <nav aria-label="Account navigation" className="grid gap-1 text-sm">
                <a
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-market-muted hover:bg-market-soft"
                  href="/account/orders"
                >
                  <ClipboardList size={17} /> Orders
                </a>
                <a
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-market-muted hover:bg-market-soft"
                  href="/account"
                >
                  <UserRound size={17} /> Account
                </a>
              </nav>
            </div>
          </div>
        </aside>
        <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
      </div>
      <nav
        aria-label="Customer navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-market-line bg-white px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(17,24,39,0.08)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-market-green-dark"
              href="/shop"
            >
              <Home size={19} /> Shop
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/shop"
            >
              <Store size={19} /> Aisles
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/account/orders"
            >
              <ClipboardList size={19} /> Orders
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/account/cart"
            >
              <ShoppingBag size={19} /> Cart
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/account"
            >
              <UserRound size={19} /> Account
            </a>
          </li>
        </ul>
      </nav>
    </main>
  );
}

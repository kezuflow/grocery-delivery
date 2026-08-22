import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  Heart,
  Home,
  ListOrdered,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import type { SessionSummary } from "../../lib/permissions";
import { AccountMenu } from "./account-menu";
import { BrandLink } from "./brand-link";
import { OnlineStatus } from "./online-status";

export function MarketplaceShell({
  session,
  search = "",
  children,
}: Readonly<{ session: SessionSummary | null; search?: string; children: ReactNode }>) {
  const showCustomerNavigation = session?.role === "customer";

  return (
    <main className="marketplace-shell min-h-screen bg-market-paper text-market-ink pb-24 lg:pb-0">
      <OnlineStatus />
      <header className="border-b border-market-line bg-white">
        <div className="marketplace-topbar hidden bg-market-green text-white lg:block">
          <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
            <BrandLink tone="inverse" />
            <form
              action="/shop"
              className="hidden h-12 min-w-0 max-w-[810px] flex-1 lg:flex"
              role="search"
            >
              <label className="sr-only" htmlFor="header-category">
                Select category
              </label>
              <select
                className="w-44 rounded-l-full border-0 bg-white px-5 text-sm text-market-ink outline-none"
                defaultValue=""
                id="header-category"
              >
                <option value="">Select Category</option>
                <option value="all">All categories</option>
              </select>
              <label className="sr-only" htmlFor="header-search">
                Search products
              </label>
              <input
                className="min-w-0 flex-1 border-l border-market-line bg-white px-5 text-sm text-market-ink outline-none"
                id="header-search"
                name="search"
                placeholder="Search Products"
              />
              <button
                aria-label="Search products"
                className="grid w-16 place-items-center rounded-r-full bg-[#f59e0b] text-white"
                type="submit"
              >
                <Search size={21} />
              </button>
            </form>
            <div className="hidden items-center gap-5 text-sm lg:flex">
              <span>EN⌄</span>
              <span className="text-right font-bold leading-tight">
                ☎ 91 2345 678
                <small className="block text-xs font-normal">Call out Hotline 24/7</small>
              </span>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              {showCustomerNavigation ? (
                <a aria-label="Cart" href="/account/cart">
                  <ShoppingBag size={21} />
                </a>
              ) : null}
              <Menu aria-hidden="true" size={22} />
            </div>
          </div>
        </div>
        <div className="bg-[#60f5b1] px-4 pb-5 pt-5 lg:hidden">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-market-ink">Good Morning</p>
                <p className="mt-1 text-[11px] text-market-ink">Weekly grocery delivery</p>
              </div>
              {showCustomerNavigation ? (
                <div className="flex items-center gap-3">
                  <a aria-label="Your cart" href="/account/cart">
                    <ShoppingBag size={22} />
                  </a>
                  <a aria-label="Your account" href="/account">
                    <UserRound size={22} />
                  </a>
                </div>
              ) : null}
            </div>
            <form action="/shop" className="relative" role="search">
              <label className="sr-only" htmlFor="mobile-market-search">
                Search products
              </label>
              <input
                className="h-12 w-full rounded-full border-0 bg-white/70 px-4 pr-12 text-sm outline-none"
                defaultValue={search}
                id="mobile-market-search"
                name="search"
                placeholder="Search fruits, vegetables, dairy, snacks..."
                type="search"
              />
              <button
                aria-label="Search products"
                className="absolute right-3 top-3 text-market-ink"
                type="submit"
              >
                <Search size={25} strokeWidth={1.6} />
              </button>
            </form>
          </div>
        </div>
        <div className="hidden border-b border-market-line bg-white lg:block">
          <div className="mx-auto flex h-[62px] max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
            <a
              className="flex items-center gap-3 border-x border-market-line px-5 py-3 text-sm font-semibold"
              href="/shop"
            >
              <Menu size={19} /> All Categories <ChevronDown size={16} />
            </a>
            <nav
              aria-label="Marketplace navigation"
              className="flex items-center gap-9 text-sm text-market-ink"
            >
              <a href="/">Home⌄</a>
              <a className="font-bold text-market-green" href="/shop">
                Shop⌄
              </a>
              {showCustomerNavigation ? (
                <>
                  <a href="/account">Pages⌄</a>
                  <a href="/account/orders">Orders⌄</a>
                  <a href="/account/support">Contact</a>
                </>
              ) : null}
            </nav>
            <div className="flex items-center gap-5 text-market-ink">
              <span className="text-sm">PHP⌄</span>
              <ArrowLeftRight size={19} />
              <Heart size={20} />
              {showCustomerNavigation ? <ShoppingBag aria-label="Cart" size={20} /> : null}
              {session ? <UserRound aria-hidden="true" size={20} /> : null}
              {session ? <AccountMenu session={session} /> : null}
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      {showCustomerNavigation ? (
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
            <li>
              <a
                className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-market-muted"
                href="/account/orders"
              >
                <ListOrdered aria-hidden="true" size={20} strokeWidth={2} />
                Orders
              </a>
            </li>
            <li>
              <a
                className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-market-muted"
                href="/account"
              >
                <UserRound aria-hidden="true" size={20} strokeWidth={2} />
                Account
              </a>
            </li>
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
      ) : null}
    </main>
  );
}

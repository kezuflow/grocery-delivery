import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  ClipboardList,
  Menu,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tag,
  UserRound,
} from "lucide-react";
import type { CatalogCategoryResponse } from "@carbon/contracts";
import type { SessionSummary } from "../../lib/permissions";
import { OnlineStatus } from "./online-status";

export function MarketplaceShell({
  session,
  search = "",
  categories = [],
  children,
}: Readonly<{
  session: SessionSummary | null;
  search?: string;
  categories?: readonly CatalogCategoryResponse[];
  children: ReactNode;
}>) {
  const cartHref = session?.role === "customer" ? "/account/cart" : "/shop";
  const aisles = categories.length
    ? categories
    : [
        { id: "produce", slug: "fresh-produce", name: "Fresh produce" },
        { id: "herbs", slug: "fresh-herbs", name: "Fresh herbs" },
      ];
  return (
    <main className="marketplace-shell min-h-screen bg-white pb-20 text-market-ink lg:pb-0">
      <OnlineStatus />
      <header className="sticky top-0 z-40 border-b border-[#e8e8e8] bg-white">
        <div className="hidden h-16 items-center gap-5 px-5 lg:flex xl:px-8">
          <button
            aria-label="Open navigation"
            className="grid size-9 place-items-center rounded-full hover:bg-[#f3f3f3]"
            type="button"
          >
            <Menu size={19} />
          </button>
          <a className="shrink-0 text-[17px] font-extrabold tracking-[-0.02em]" href="/shop">
            Carbon
          </a>
          <button className="flex shrink-0 items-center gap-2 text-left text-xs" type="button">
            <Store className="text-market-green-dark" size={16} />
            <span>
              <strong className="block text-[11px]">Deliver to</strong>
              <span className="text-market-muted">Manila · This week</span>
            </span>
            <ChevronRight className="rotate-90 text-market-muted" size={13} />
          </button>
          <form
            action="/shop"
            className="mx-auto flex h-10 min-w-0 max-w-[620px] flex-1"
            role="search"
          >
            <label className="sr-only" htmlFor="header-search">
              Search the store
            </label>
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="absolute left-3.5 text-[#6b6b6b]" size={16} />
              <input
                className="h-full w-full rounded-full bg-[#f4f4f4] pl-10 pr-4 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-market-green"
                defaultValue={search}
                id="header-search"
                name="search"
                placeholder="Search the store"
                type="search"
              />
            </div>
          </form>
          <a
            aria-label="Your cart"
            className="grid size-9 place-items-center rounded-full hover:bg-[#f3f3f3]"
            href={cartHref}
          >
            <ShoppingBag size={19} />
          </a>
          {session ? (
            <a
              aria-label="Account"
              className="grid size-9 place-items-center rounded-full hover:bg-[#f3f3f3]"
              href="/account"
            >
              <UserRound size={19} />
            </a>
          ) : (
            <a className="text-xs font-semibold" href="/shop">
              Sign in
            </a>
          )}
        </div>
        <div className="bg-[#087443] px-4 pb-4 pt-3 lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-2 text-white">
            <button
              aria-label="Back to stores"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-black/20"
              type="button"
            >
              <ArrowLeft size={18} />
            </button>
            <form action="/shop" className="relative min-w-0 flex-1" role="search">
              <label className="sr-only" htmlFor="mobile-market-search">
                Search the store
              </label>
              <Search className="absolute left-3.5 top-3 text-[#555]" size={16} />
              <input
                className="h-10 w-full rounded-full border-0 bg-white pl-10 pr-3 text-sm text-market-ink outline-none placeholder:text-[#777]"
                defaultValue={search}
                id="mobile-market-search"
                name="search"
                placeholder="Search the store"
                type="search"
              />
            </form>
            <a
              aria-label="Your cart"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-black/20"
              href={cartHref}
            >
              <ShoppingBag size={18} />
            </a>
          </div>
        </div>
      </header>
      <div className="grid w-full lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#ededed] bg-white lg:block">
          <div className="sticky top-16 px-5 py-6">
            <div className="border-b border-[#ededed] pb-5">
              <div className="mb-3 grid size-12 place-items-center rounded-full bg-[#e6f4ed] text-market-green-dark">
                <Store size={22} />
              </div>
              <h1 className="!m-0 text-base font-extrabold">Carbon Groceries</h1>
              <p className="mt-1 text-[11px] leading-4 text-market-muted">
                Weekly delivery · Manila
              </p>
              <p className="mt-1 text-[11px] text-market-muted">4.8 ★ · Delivery this week</p>
            </div>
            <nav aria-label="Store navigation" className="mt-4 grid gap-0.5 text-[13px]">
              <a
                className="flex items-center gap-3 rounded-md bg-[#ededed] px-3 py-2.5 font-bold"
                href="/shop"
              >
                <Store size={15} /> Shop
              </a>
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[#555] hover:bg-[#f6f6f6]"
                href="/shop"
              >
                <Tag size={15} /> Deals
              </a>
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[#555] hover:bg-[#f6f6f6]"
                href="/shop"
              >
                <ClipboardList size={15} /> Shop your list
              </a>
            </nav>
            <div className="mt-5 border-t border-[#ededed] pt-5">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-market-muted">
                Aisles
              </p>
              <nav aria-label="Store aisles" className="grid gap-0.5 text-[12px]">
                {aisles.map((category) => (
                  <a
                    className="rounded-md px-3 py-2 text-[#333] hover:bg-[#f6f6f6]"
                    href={`/shop?category=${category.slug}`}
                    key={category.id}
                  >
                    {category.name}
                  </a>
                ))}
              </nav>
            </div>
            <div className="mt-5 border-t border-[#ededed] pt-5">
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#555] hover:bg-[#f6f6f6]"
                href="/account/orders"
              >
                <ClipboardList size={15} /> Orders
              </a>
              <a
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#555] hover:bg-[#f6f6f6]"
                href="/account/cart"
              >
                <ShoppingBag size={15} /> Cart
              </a>
            </div>
          </div>
        </aside>
        <div className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</div>
      </div>
      <nav
        aria-label="Customer navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dedede] bg-white px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-market-ink"
              href="/shop"
            >
              <Store size={19} /> Shop
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/shop"
            >
              <SlidersHorizontal size={19} /> Aisles
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/shop"
            >
              <Tag size={19} /> Deals
            </a>
          </li>
          <li>
            <a
              className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-market-muted"
              href="/account/cart"
            >
              <Bookmark size={19} /> My list
            </a>
          </li>
        </ul>
      </nav>
    </main>
  );
}

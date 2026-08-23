"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  ClipboardList,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tag,
  Truck,
  UserRound,
} from "lucide-react";
import type {
  CartResponse,
  CatalogCategoryResponse,
  DeliveryAddressResponse,
} from "@carbon/contracts";
import type { SessionSummary } from "../../lib/permissions";
import { OnlineStatus } from "./online-status";

export function MarketplaceShell({
  session,
  search = "",
  categories = [],
  cart,
  deliveryAddress = null,
  children,
}: Readonly<{
  session: SessionSummary | null;
  search?: string;
  categories?: readonly CatalogCategoryResponse[];
  cart?: CartResponse["data"];
  deliveryAddress?: DeliveryAddressResponse["data"];
  children: ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const cartHref = session?.role === "customer" ? "/account/cart" : "/shop";
  const cartCount = cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
  const aisles = categories.length
    ? categories
    : [
        { id: "produce", slug: "fresh-produce", name: "Fresh produce" },
        { id: "herbs", slug: "fresh-herbs", name: "Fresh herbs" },
      ];
  const addressLabel = deliveryAddress
    ? `${deliveryAddress.line1}, ${deliveryAddress.city}`
    : session?.role === "customer"
      ? "Choose a delivery address"
      : "Manila delivery area";

  return (
    <main className="marketplace-shell min-h-screen bg-white pb-20 text-market-ink lg:pb-0">
      <OnlineStatus />
      <header className="sticky top-0 z-40 border-b border-base-line bg-white">
        <div className="hidden min-h-16 items-center gap-4 px-5 lg:flex xl:px-8">
          <button
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Collapse navigation" : "Expand navigation"}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-base-surface"
            onClick={() => setSidebarOpen((open) => !open)}
            title={sidebarOpen ? "Collapse navigation" : "Expand navigation"}
            type="button"
          >
            {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <a className="shrink-0 text-[17px] font-extrabold tracking-[-0.02em]" href="/shop">
            Carbon
          </a>
          <FulfillmentControl />
          <DeliveryAddressControl addressLabel={addressLabel} compact={true} />
          <form
            action="/shop"
            className="mx-auto flex h-11 min-w-0 max-w-[620px] flex-1"
            role="search"
          >
            <label className="sr-only" htmlFor="header-search">
              Search the store
            </label>
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="absolute left-3.5 text-base-muted" size={17} />
              <input
                className="h-full w-full rounded-full bg-base-surface pl-10 pr-4 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-market-green"
                defaultValue={search}
                id="header-search"
                name="search"
                placeholder="Search Carbon Market"
                type="search"
              />
            </div>
          </form>
          <a
            aria-label={cartCount ? `Your cart, ${cartCount} items` : "Your cart"}
            className="relative grid size-10 shrink-0 place-items-center rounded-full hover:bg-base-surface"
            href={cartHref}
            title="Your cart"
          >
            <ShoppingBag size={19} />
            {cartCount ? <CartBadge count={cartCount} /> : null}
          </a>
          {session ? (
            <a
              aria-label="Account"
              className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-base-surface"
              href="/account"
              title="Account"
            >
              <UserRound size={19} />
            </a>
          ) : (
            <a className="shrink-0 text-xs font-semibold" href="/shop">
              Sign in
            </a>
          )}
        </div>
        <div className="bg-[#087443] px-4 pb-3 pt-2.5 lg:hidden">
          <div className="mx-auto grid max-w-md gap-2 text-white">
            <div className="flex items-center justify-between gap-3">
              <FulfillmentControl inverse={true} />
              <DeliveryAddressControl addressLabel={addressLabel} />
            </div>
            <div className="flex items-center gap-2">
              <a
                aria-label="Back to stores"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-black/20"
                href="/shop"
              >
                <ArrowLeft size={18} />
              </a>
              <form action="/shop" className="relative min-w-0 flex-1" role="search">
                <label className="sr-only" htmlFor="mobile-market-search">
                  Search the store
                </label>
                <Search className="absolute left-3.5 top-3 text-base-muted" size={16} />
                <input
                  className="h-10 w-full rounded-full border-0 bg-white pl-10 pr-3 text-sm text-base-ink outline-none placeholder:text-base-muted"
                  defaultValue={search}
                  id="mobile-market-search"
                  name="search"
                  placeholder="Search Carbon Market"
                  type="search"
                />
              </form>
              <a
                aria-label={cartCount ? `Your cart, ${cartCount} items` : "Your cart"}
                className="relative grid size-9 shrink-0 place-items-center rounded-full bg-black/20"
                href={cartHref}
                title="Your cart"
              >
                <ShoppingBag size={18} />
                {cartCount ? <CartBadge count={cartCount} /> : null}
              </a>
            </div>
          </div>
        </div>
      </header>
      <div
        className={`grid w-full transition-[grid-template-columns] duration-200 ${sidebarOpen ? "lg:grid-cols-[232px_minmax(0,1fr)]" : "lg:grid-cols-[72px_minmax(0,1fr)]"}`}
        data-sidebar={sidebarOpen ? "expanded" : "collapsed"}
      >
        <aside className="hidden border-r border-base-line bg-white lg:block">
          <div className="sticky top-16 px-3 py-6">
            <nav aria-label="Store navigation" className="grid gap-0.5 text-[13px]">
              <RailLink
                active={true}
                href="/shop"
                icon={<Store size={17} />}
                label="Shop"
                open={sidebarOpen}
              />
              <RailLink href="/shop" icon={<Tag size={17} />} label="Deals" open={sidebarOpen} />
              <RailLink
                href="/shop"
                icon={<ClipboardList size={17} />}
                label="Shop your list"
                open={sidebarOpen}
              />
            </nav>
            {sidebarOpen ? (
              <div className="mt-5 border-t border-base-line pt-5">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-market-muted">
                  Aisles
                </p>
                <nav aria-label="Store aisles" className="grid gap-0.5 text-[12px]">
                  {aisles.map((category) => (
                    <a
                      className="flex min-h-9 items-center rounded-md px-3 py-2 text-base-ink hover:bg-base-surface"
                      href={`/shop?category=${category.slug}`}
                      key={category.id}
                    >
                      {category.name}
                    </a>
                  ))}
                </nav>
              </div>
            ) : null}
            <div className="mt-5 border-t border-base-line pt-5">
              <RailLink
                href="/account/orders"
                icon={<ClipboardList size={17} />}
                label="Orders"
                open={sidebarOpen}
              />
              <RailLink
                badge={cartCount}
                href={cartHref}
                icon={<ShoppingBag size={17} />}
                label="Cart"
                open={sidebarOpen}
              />
            </div>
          </div>
        </aside>
        <div className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</div>
      </div>
      <nav
        aria-label="Customer navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-base-line bg-white px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <li>
            <BottomLink active={true} href="/shop" icon={<Store size={19} />} label="Shop" />
          </li>
          <li>
            <BottomLink href="/shop" icon={<SlidersHorizontal size={19} />} label="Aisles" />
          </li>
          <li>
            <BottomLink href="/shop" icon={<Tag size={19} />} label="Deals" />
          </li>
          <li>
            <BottomLink href="/account/cart" icon={<Bookmark size={19} />} label="My list" />
          </li>
        </ul>
      </nav>
    </main>
  );
}

function FulfillmentControl({ inverse = false }: Readonly<{ inverse?: boolean }>) {
  return (
    <div
      aria-label="Fulfillment mode"
      className={`flex shrink-0 items-center gap-1 rounded-full p-1 text-[11px] font-bold ${inverse ? "bg-black/15" : "bg-base-surface"}`}
      role="group"
    >
      <button
        aria-pressed="true"
        className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-market-ink shadow-sm"
        type="button"
      >
        <Truck size={13} /> Delivery
      </button>
      <button
        className={`rounded-full px-3 py-1.5 ${inverse ? "text-white/60" : "text-base-muted"}`}
        disabled={true}
        title="Pickup is not available for weekly orders"
        type="button"
      >
        Pickup
      </button>
    </div>
  );
}

function DeliveryAddressControl({
  addressLabel,
  compact = false,
}: Readonly<{ addressLabel: string; compact?: boolean }>) {
  return (
    <a
      className={`flex min-w-0 items-center gap-2 text-left ${compact ? "max-w-[190px] shrink-0" : "max-w-[210px]"}`}
      href="/account"
      title="Change delivery address"
    >
      <MapPin className="shrink-0 text-current" size={16} />
      <span className="min-w-0">
        <strong className="block text-[10px] uppercase tracking-[0.08em] text-current/90">
          Deliver to
        </strong>
        <span className="block truncate text-xs font-semibold">{addressLabel}</span>
      </span>
      <ChevronRight className="shrink-0 rotate-90 text-current/60" size={14} />
    </a>
  );
}

function RailLink({
  href,
  icon,
  label,
  open,
  active = false,
  badge = 0,
}: Readonly<{
  href: string;
  icon: ReactNode;
  label: string;
  open: boolean;
  active?: boolean;
  badge?: number;
}>) {
  return (
    <a
      aria-label={open ? undefined : label}
      className={`relative flex min-h-10 items-center rounded-md px-3 py-2.5 font-semibold ${open ? "gap-3" : "justify-center"} ${active ? "bg-base-line font-bold" : "text-base-muted hover:bg-base-surface"}`}
      href={href}
      title={open ? undefined : label}
    >
      {icon}
      {open ? <span>{label}</span> : null}
      {!open && badge ? <CartBadge count={badge} /> : null}
    </a>
  );
}

function BottomLink({
  href,
  icon,
  label,
  active = false,
}: Readonly<{ href: string; icon: ReactNode; label: string; active?: boolean }>) {
  return (
    <a
      className={`flex flex-col items-center gap-1 py-1 text-[10px] ${active ? "font-bold text-market-ink" : "font-semibold text-market-muted"}`}
      href={href}
    >
      {icon}
      {label}
    </a>
  );
}

function CartBadge({ count }: Readonly<{ count: number }>) {
  return (
    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-market-green px-1 text-[9px] font-extrabold leading-4 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

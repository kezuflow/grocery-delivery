"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  ClipboardList,
  Gift,
  Home,
  Leaf,
  MapPin,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tag,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import type {
  CartResponse,
  CatalogCategoryResponse,
  DeliveryAddressResponse,
} from "@carbon/contracts";
import type { SessionSummary } from "../../lib/permissions";
import { OnlineStatus } from "./online-status";
import { SignOutButton } from "./sign-out-button";

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
  const [accountOpen, setAccountOpen] = useState(false);
  const cartHref = session?.role === "customer" ? "/account/cart" : "/shop";
  const cartCount = cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
  const aisles = categories.length
    ? categories
    : [
        { id: "produce", slug: "fresh-produce", name: "Fresh produce" },
        { id: "herbs", slug: "fresh-herbs", name: "Fresh herbs" },
      ];
  const categoryItems = aisles.map((category) => ({
    ...category,
    label: category.slug === "fresh-produce" ? "Vegetables" : category.name,
  }));
  const addressLabel = deliveryAddress
    ? `${deliveryAddress.line1}, ${deliveryAddress.city}`
    : session?.role === "customer"
      ? "Choose a delivery address"
      : "Manila delivery area";

  useEffect(() => {
    if (!accountOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [accountOpen]);

  return (
    <main className="marketplace-shell min-h-screen bg-white pb-20 text-market-ink lg:pb-0">
      <OnlineStatus />
      <header className="sticky top-0 z-40 bg-white">
        <div className="hidden min-h-16 items-center gap-4 px-5 lg:flex xl:px-8">
          <button
            aria-expanded={accountOpen}
            aria-haspopup="dialog"
            aria-label="Open account menu"
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-base-surface"
            onClick={() => setAccountOpen(true)}
            title="Open account menu"
            type="button"
          >
            <UserRound size={19} />
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
      <div className="grid w-full lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden bg-white lg:block">
          <div className="sticky top-16 px-3 py-6">
            <nav aria-label="Store categories" className="grid gap-0.5 text-[13px]">
              <CategoryLink active href="/shop" icon={<Home size={17} />} label="Home" />
              <CategoryLink href="/shop" icon={<Store size={17} />} label="Grocery" />
              {categoryItems.map((category) => (
                <CategoryLink
                  href={`/shop?category=${category.slug}`}
                  icon={<Leaf size={17} />}
                  key={category.id}
                  label={category.label}
                />
              ))}
              <CategoryLink href="/shop#featured-offers" icon={<Gift size={17} />} label="Promo" />
            </nav>
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
      {accountOpen ? (
        <AccountDrawer onClose={() => setAccountOpen(false)} session={session} />
      ) : null}
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

function CategoryLink({
  href,
  icon,
  label,
  active = false,
}: Readonly<{
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}>) {
  return (
    <a
      className={`flex min-h-10 items-center gap-3 rounded-md border-0 px-3 py-2.5 font-semibold ${active ? "bg-base-line font-bold" : "text-base-muted hover:bg-base-surface"}`}
      href={href}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function AccountDrawer({
  onClose,
  session,
}: Readonly<{
  onClose: () => void;
  session: SessionSummary | null;
}>) {
  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        aria-label="Close account menu"
        className="absolute inset-0 cursor-default bg-black/30"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Account menu"
        aria-modal="true"
        className="relative h-full w-[min(360px,calc(100vw-2rem))] max-w-full overflow-y-auto bg-white px-5 py-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-base-line pb-5">
          <div>
            <p className="text-lg font-extrabold text-market-ink">Your account</p>
            <p className="mt-1 text-xs text-market-muted">
              {session
                ? "Manage your Carbon account and orders."
                : "Sign in to manage your account."}
            </p>
          </div>
          <button
            aria-label="Close account menu"
            className="grid size-9 place-items-center rounded-full hover:bg-base-surface"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="mt-5 grid gap-1" aria-label="Account navigation">
          {session ? (
            <>
              <DrawerLink href="/account" icon={<UserRound size={17} />} label="Manage account" />
              <DrawerLink
                href="/account/orders"
                icon={<ClipboardList size={17} />}
                label="Orders"
              />
              <DrawerLink href="/account/cart" icon={<ShoppingBag size={17} />} label="Cart" />
              <DrawerLink href="/account/saved" icon={<Bookmark size={17} />} label="Saved items" />
            </>
          ) : (
            <DrawerLink href="/shop" icon={<UserRound size={17} />} label="Sign in" />
          )}
          <DrawerLink href="/shop#featured-offers" icon={<Tag size={17} />} label="Promotions" />
          <DrawerLink href="/account/support" icon={<ClipboardList size={17} />} label="Help" />
        </nav>
        {session ? (
          <div className="mt-6 border-t border-base-line pt-5">
            <SignOutButton />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function DrawerLink({
  href,
  icon,
  label,
}: Readonly<{ href: string; icon: ReactNode; label: string }>) {
  return (
    <a
      className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-base-ink hover:bg-base-surface"
      href={href}
    >
      {icon}
      <span>{label}</span>
      <ChevronRight className="ml-auto text-base-muted" size={15} />
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

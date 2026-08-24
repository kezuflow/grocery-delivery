import type { ReactNode } from "react";
import { Leaf } from "lucide-react";

import { MobileNavigation } from "./mobile-navigation";

export type PublicNavigationItem = Readonly<{ href: string; label: string }>;

export function PublicShell({
  navigation,
  actions,
  children,
}: Readonly<{
  navigation: readonly PublicNavigationItem[];
  actions: ReactNode;
  children: ReactNode;
}>) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-paper font-sans text-ink">
      <a
        className="flex min-h-9 items-center justify-center gap-2 bg-deep px-4 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sun"
        href="#plans"
      >
        <span className="text-sun">Your first calendar month is free.</span>
        <span className="hidden text-white/70 sm:inline">See eligible weekly plans</span>
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <PublicBrandLink />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4">
            <MobileNavigation items={navigation} />
            <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
              {navigation.map((item) => (
                <a
                  className="text-sm font-bold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            {actions}
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}

function PublicBrandLink() {
  return (
    <a
      aria-label="Freshmarkets home"
      className="inline-flex min-w-0 items-center gap-3 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep"
      href="/"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-deep text-white"
      >
        <Leaf size={17} strokeWidth={2.25} />
      </span>
      <span className="truncate text-lg tracking-[-0.02em]">freshmarkets</span>
    </a>
  );
}

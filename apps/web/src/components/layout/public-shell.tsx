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
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <PublicBrandLink />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4">
            <MobileNavigation items={navigation} />
            <nav aria-label="Primary navigation" className="hidden items-center gap-6 lg:flex">
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
      aria-label="Carbon Food Delivery home"
      className="inline-flex min-w-0 items-center gap-2.5 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep"
      href="/"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center bg-deep text-white"
      >
        <Leaf size={17} strokeWidth={2.25} />
      </span>
      <span className="sm:hidden">Carbon</span>
      <span className="hidden truncate sm:inline">Carbon Food Delivery</span>
    </a>
  );
}

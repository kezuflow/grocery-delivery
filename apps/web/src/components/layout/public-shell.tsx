import type { ReactNode } from "react";

import { BrandLink } from "./brand-link";
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
    <main className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <header className="border-b border-line bg-white/95">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandLink />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-4">
            <MobileNavigation items={navigation} />
            <nav aria-label="Primary navigation" className="hidden items-center gap-5 lg:flex">
              {navigation.map((item) => (
                <a
                  className="text-sm font-bold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep"
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

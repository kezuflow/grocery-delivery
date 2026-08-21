import type { ReactNode } from "react";

import type { SessionSummary } from "../../lib/permissions";
import { AccountMenu } from "./account-menu";
import { BrandLink } from "./brand-link";
import { Breadcrumbs, type Breadcrumb } from "./breadcrumbs";
import { MobileNavigation } from "./mobile-navigation";
import { getNavigation } from "./navigation";
import { OnlineStatus } from "./online-status";

export function AppShell({
  session,
  eyebrow,
  title,
  description,
  breadcrumbs,
  status,
  children,
}: Readonly<{
  session: SessionSummary;
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs: readonly Breadcrumb[];
  status?: ReactNode;
  children: ReactNode;
}>) {
  const navigation = getNavigation(session);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <OnlineStatus />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandLink />
          <div className="flex items-center gap-3">
            <MobileNavigation items={navigation} />
            <AccountMenu session={session} />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-12">
        <aside className="hidden lg:block">
          <nav aria-label="Section navigation" className="sticky top-8">
            <ul className="grid gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a
                    className="block rounded px-3 py-2.5 text-sm font-bold text-muted hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">
          <Breadcrumbs items={breadcrumbs} />
          <header className="mt-6 flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>
              ) : null}
            </div>
            {status ? <div className="shrink-0">{status}</div> : null}
          </header>
          <div className="min-w-0 py-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

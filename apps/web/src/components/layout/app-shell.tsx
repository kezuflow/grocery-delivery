import type { ReactNode } from "react";
import { ChevronDown, CircleHelp, Leaf, Store } from "lucide-react";

import type { SessionSummary } from "../../lib/permissions";
import { AdminNavigation } from "./admin-navigation";
import { AdminWorkspaceSearch } from "./admin-workspace-search";
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

  if (session.role === "admin") {
    return (
      <main className="min-h-screen bg-admin-canvas text-admin-text-primary">
        <OnlineStatus />
        <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="hidden min-h-screen border-r border-admin-border bg-admin-surface lg:flex lg:flex-col">
            <div className="flex h-[52px] items-center border-b border-admin-border px-3">
              <a
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-semibold text-admin-text-primary transition-colors hover:bg-admin-surface-hover"
                href="/admin"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-admin-accent text-white">
                  <Leaf aria-hidden="true" size={15} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px]">Carbon workspace</span>
                <ChevronDown
                  aria-hidden="true"
                  className="ml-auto text-admin-text-muted"
                  size={13}
                />
              </a>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminNavigation items={navigation} />
            </div>
            <div className="grid gap-1 border-t border-admin-border p-3 text-xs">
              <a
                className="flex min-h-8 items-center gap-2 rounded-md px-2 text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text-primary"
                href="/"
              >
                <Store aria-hidden="true" size={15} /> Storefront
              </a>
              <a
                className="flex min-h-8 items-center gap-2 rounded-md px-2 text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text-primary"
                href="/admin/support"
              >
                <CircleHelp aria-hidden="true" size={15} /> Help and support
              </a>
            </div>
          </aside>

          <section className="min-w-0">
            <header className="sticky top-0 z-20 flex h-[52px] items-center gap-3 border-b border-admin-border bg-admin-surface px-4 sm:px-6">
              <div className="lg:hidden">
                <MobileNavigation items={navigation} />
              </div>
              <span className="hidden shrink-0 rounded border border-admin-border bg-admin-surface-subtle px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted sm:inline-flex">
                Local
              </span>
              <div className="flex flex-1 justify-center">
                <AdminWorkspaceSearch items={navigation} />
              </div>
              <AccountMenu session={session} />
            </header>

            <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5 xl:px-8">
              <Breadcrumbs items={breadcrumbs} className="text-admin-text-muted" />
              <header className="mt-3 flex flex-col gap-3 border-b border-admin-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-admin-text-muted">
                    {eyebrow}
                  </p>
                  <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-admin-text-primary">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-admin-text-secondary">
                      {description}
                    </p>
                  ) : null}
                </div>
                {status ? <div className="shrink-0 pt-1">{status}</div> : null}
              </header>
              <div className="min-w-0 py-5">{children}</div>
            </div>
          </section>
        </div>
      </main>
    );
  }

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

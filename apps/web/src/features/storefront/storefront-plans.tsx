import { Check } from "lucide-react";

import { EmptyState, ErrorState, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import type { StorefrontData } from "../../lib/storefront";

export function StorefrontPlans({ storefront }: Readonly<{ storefront: StorefrontData }>) {
  return (
    <section className="bg-deep py-20 text-white sm:py-28" id="plans">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sun">Weekly plans</p>
            <h2 className="storefront-display mt-4 max-w-3xl text-4xl leading-[1.04] tracking-[-0.035em] sm:text-6xl">
              Pick the rhythm. Keep the flexibility.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/70 lg:justify-self-end">
            Weekly fees and included grocery credits come directly from the active plan catalog. You
            can activate your free month after creating an account.
          </p>
        </div>

        {storefront.error ? (
          <ErrorState
            className="mt-10 border-white/20 bg-white text-ink"
            description={storefront.error}
            title="Plans are temporarily unavailable"
          />
        ) : storefront.plans.length ? (
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {storefront.plans.map((plan) => (
              <article
                className="grid min-h-[420px] content-start gap-6 rounded-2xl border border-white/15 bg-paper p-6 text-ink sm:p-7"
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral">
                      {plan.code}
                    </p>
                    <h3 className="storefront-display mt-2 text-3xl tracking-[-0.03em]">
                      {plan.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-deep">
                    Weekly
                  </span>
                </div>
                <div className="border-b border-line pb-6">
                  <strong className="text-4xl tracking-[-0.04em]">
                    {formatPhp(plan.weeklyFee.centavos)}
                  </strong>
                  <span className="text-sm text-muted"> / week</span>
                  <p className="mt-2 text-sm font-bold text-deep">
                    {formatPhp(plan.weeklyCredit.centavos)} grocery credit included
                  </p>
                </div>
                <ul className="grid gap-3 text-sm leading-6 text-muted">
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-1 shrink-0 text-success" size={16} />
                    Server-confirmed prices and totals at every step.
                  </li>
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-1 shrink-0 text-success" size={16} />
                    Edit your basket before the active cutoff.
                  </li>
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-1 shrink-0 text-success" size={16} />
                    Activate a one-calendar-month free trial once.
                  </li>
                </ul>
                <LinkButton className="mt-auto" href="/shop" tone="secondary">
                  Choose {plan.name}
                </LinkButton>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-10 border-white/30 bg-white text-ink"
            description="There are no active weekly plans right now."
            title="Plans are being prepared"
          />
        )}
      </div>
    </section>
  );
}

import { Check } from "lucide-react";

import { EmptyState, ErrorState, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import type { StorefrontData } from "../../lib/storefront";

export function StorefrontPlans({ storefront }: Readonly<{ storefront: StorefrontData }>) {
  return (
    <section className="bg-deep py-20 text-white sm:py-24" id="plans">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr] lg:items-end">
          <div>
            <p className="text-sm font-bold text-sun">Weekly plans</p>
            <h2 className="storefront-display mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
              Start with the plan that fits the way you shop.
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
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {storefront.plans.map((plan) => (
              <article
                className="grid min-h-[360px] content-start gap-5 rounded-[6px] border border-white/20 bg-white p-6 text-ink"
                key={plan.id}
              >
                <div>
                  <div>
                    <p className="text-xs font-bold text-coral">{plan.code}</p>
                    <h3 className="storefront-display mt-2 text-3xl">{plan.name}</h3>
                  </div>
                </div>
                <div>
                  <strong className="text-3xl">{formatPhp(plan.weeklyFee.centavos)}</strong>
                  <span className="text-sm text-muted"> / week</span>
                </div>
                <ul className="grid gap-3 text-sm leading-6 text-muted">
                  <li className="flex gap-2">
                    <Check aria-hidden="true" className="mt-1 shrink-0 text-success" size={16} />
                    Includes {formatPhp(plan.weeklyCredit.centavos)} in weekly grocery credit.
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
                  Go to app
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

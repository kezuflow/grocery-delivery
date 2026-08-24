import { ArrowRight, CalendarHeart } from "lucide-react";

import { LinkButton } from "../../components/ui";
import type { SessionSummary } from "../../lib/permissions";
import { storefrontMedia } from "./storefront-media";

export function StorefrontTrial({ session }: Readonly<{ session: SessionSummary | null }>) {
  return (
    <section className="bg-sun text-ink" id="join">
      <div className="mx-auto grid max-w-[1240px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-xl">
            <span className="grid size-12 place-items-center rounded-full bg-deep text-white">
              <CalendarHeart aria-hidden="true" size={23} />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-deep">
              Your first month is on us
            </p>
            <h2 className="storefront-display mt-4 text-4xl leading-[1.04] tracking-[-0.035em] sm:text-6xl">
              Give the weekly rhythm a real try.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-ink/75">
              Choose an active plan after signing in. Trial eligibility and dates are confirmed by
              the server, and recurring billing waits until the trial ends.
            </p>
            <div className="mt-8">
              <LinkButton href="/shop" size="lg">
                {session?.role === "customer" ? "Open your market" : "Start shopping"}
                <ArrowRight aria-hidden="true" size={18} />
              </LinkButton>
            </div>
          </div>
        </div>
        <div className="relative min-h-[420px] overflow-hidden bg-deep lg:min-h-[620px]">
          <img
            alt={storefrontMedia.trial.alt}
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            loading="lazy"
            src={storefrontMedia.trial.src}
          />
        </div>
      </div>
    </section>
  );
}

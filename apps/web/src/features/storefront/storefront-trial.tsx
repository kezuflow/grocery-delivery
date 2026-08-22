import { ArrowRight, CalendarHeart } from "lucide-react";

import { LinkButton } from "../../components/ui";
import type { SessionSummary } from "../../lib/permissions";
import { PublicAuthControls } from "../auth";
import { storefrontMedia } from "./storefront-media";

export function StorefrontTrial({ session }: Readonly<{ session: SessionSummary | null }>) {
  return (
    <section className="bg-coral text-white" id="join">
      <div className="mx-auto grid max-w-[1240px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-xl">
            <span className="grid size-12 place-items-center bg-sun text-ink">
              <CalendarHeart aria-hidden="true" size={23} />
            </span>
            <p className="mt-6 text-sm font-bold text-white">Your first month is on us</p>
            <h2 className="storefront-display mt-3 text-4xl leading-tight sm:text-5xl">
              Try the full weekly market for one calendar month.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white">
              Choose an active plan after signing in. Trial eligibility and dates are confirmed by
              the server, and recurring billing waits until the trial ends.
            </p>
            <div className="mt-8">
              {session?.role === "customer" ? (
                <LinkButton href="/shop" size="lg" tone="accent">
                  Activate from the marketplace
                  <ArrowRight aria-hidden="true" size={18} />
                </LinkButton>
              ) : (
                <PublicAuthControls inverse session={session} />
              )}
            </div>
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden bg-deep lg:min-h-[560px]">
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

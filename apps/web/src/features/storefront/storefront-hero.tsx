import { ArrowRight, Check } from "lucide-react";

import { LinkButton } from "../../components/ui";
import type { SessionSummary } from "../../lib/permissions";
import type { StorefrontData } from "../../lib/storefront";
import { storefrontMedia } from "./storefront-media";

export function StorefrontHero({
  banner,
  session,
}: Readonly<{
  banner: StorefrontData["banners"][number] | undefined;
  session: SessionSummary | null;
}>) {
  const customerDestination = "/shop";

  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-deep text-white sm:min-h-[680px]">
      <picture>
        <source
          media="(max-width: 640px)"
          srcSet={banner?.mobileUrl ?? storefrontMedia.hero.mobile}
        />
        <img
          alt={banner?.altText ?? storefrontMedia.hero.alt}
          className="absolute inset-0 -z-20 size-full object-cover"
          decoding="async"
          fetchPriority="high"
          src={banner?.desktopUrl ?? storefrontMedia.hero.desktop}
        />
      </picture>
      <div className="absolute inset-0 -z-10 bg-[#10251dcc]" />

      <div className="mx-auto flex min-h-[620px] max-w-[1240px] items-end px-4 pb-16 pt-24 sm:min-h-[680px] sm:px-6 sm:pb-20 lg:px-8">
        <div className="max-w-[760px]">
          <p className="mb-4 text-sm font-bold text-sun">Weekly market, delivered</p>
          <h1 className="storefront-display text-5xl leading-[1.02] sm:text-7xl">
            Carbon Food Delivery
          </h1>
          <p className="storefront-display mt-5 max-w-2xl text-3xl leading-tight text-white sm:text-5xl">
            {banner?.title ?? "Fresh groceries planned around your week."}
          </p>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
            {banner?.copy ??
              "Shop a server-priced weekly market, choose a practical delivery window, and keep every order in one place."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton
              href={banner?.ctaDestination ?? customerDestination}
              size="lg"
              tone="accent"
            >
              {banner?.ctaLabel ?? (session?.role === "customer" ? "Open the app" : "Go to app")}
              <ArrowRight aria-hidden="true" size={18} />
            </LinkButton>
            <LinkButton
              className="border-white/60 text-white hover:bg-white/10"
              href="#how-it-works"
              size="lg"
              tone="secondary"
            >
              How it works
            </LinkButton>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/85">
            {[
              "Prices confirmed by the server",
              "One-month free trial",
              "Mobile-first weekly shopping",
            ].map((item) => (
              <li className="flex items-center gap-2" key={item}>
                <span className="grid size-5 place-items-center bg-coral text-white">
                  <Check aria-hidden="true" size={14} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

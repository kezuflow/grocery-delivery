import { ArrowRight, CalendarDays, ShoppingBasket, Truck } from "lucide-react";

import { LinkButton } from "../../components/ui";

import { storefrontMedia } from "./storefront-media";

const steps = [
  {
    icon: "basket",
    number: "01",
    title: "Build your weekly basket",
    description:
      "Search the active catalog, adjust quantities, and keep a saved cart across visits.",
  },
  {
    icon: "calendar",
    number: "02",
    title: "Choose the plan and window",
    description: "Pick the plan and available delivery time that suit your household rhythm.",
  },
  {
    icon: "truck",
    number: "03",
    title: "Follow it to your door",
    description: "Review server-confirmed totals and track fulfillment after the order is locked.",
  },
] as const;

export function StorefrontProcess() {
  return (
    <section className="bg-paper py-20 sm:py-28" id="how-it-works">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20 lg:px-8">
        <div className="relative min-h-[460px] overflow-hidden rounded-3xl bg-deep sm:min-h-[620px]">
          <img
            alt={storefrontMedia.process.alt}
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            loading="lazy"
            src={storefrontMedia.process.src}
          />
          <div className="absolute inset-x-0 bottom-0 bg-deep/92 p-6 text-white backdrop-blur-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sun">
              Packed with care
            </p>
            <p className="storefront-display mt-2 text-2xl leading-tight sm:text-3xl">
              One crate, one order, one clear trip home.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">How it works</p>
          <h2 className="storefront-display mt-4 text-4xl leading-[1.04] tracking-[-0.035em] sm:text-6xl">
            A calmer way to stock the kitchen.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Carbon keeps the basket, plan, delivery window, payment readiness, and order history in
            one connected weekly flow.
          </p>
          <ol className="mt-10 divide-y divide-line border-y border-line">
            {steps.map(({ icon, number, title, description }) => (
              <li className="grid grid-cols-[auto_1fr_auto] gap-4 py-6" key={number}>
                <span className="grid size-11 place-items-center rounded-full bg-white text-deep">
                  {icon === "basket" ? <ShoppingBasket aria-hidden="true" size={21} /> : null}
                  {icon === "calendar" ? <CalendarDays aria-hidden="true" size={21} /> : null}
                  {icon === "truck" ? <Truck aria-hidden="true" size={21} /> : null}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                </div>
                <span className="text-xs font-bold tracking-[0.14em] text-muted">{number}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <LinkButton href="/shop">
              Start your weekly basket
              <ArrowRight aria-hidden="true" size={17} />
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}

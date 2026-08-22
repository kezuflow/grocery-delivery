import { CalendarDays, ShoppingBasket, Truck } from "lucide-react";

import { storefrontMedia } from "./storefront-media";

const steps = [
  {
    icon: ShoppingBasket,
    number: "01",
    title: "Build your weekly basket",
    description:
      "Search the active catalog, adjust quantities, and keep a saved cart across visits.",
  },
  {
    icon: CalendarDays,
    number: "02",
    title: "Choose the plan and window",
    description: "Pick the plan and available delivery time that suit your household rhythm.",
  },
  {
    icon: Truck,
    number: "03",
    title: "Follow it to your door",
    description: "Review server-confirmed totals and track fulfillment after the order is locked.",
  },
] as const;

export function StorefrontProcess() {
  return (
    <section className="bg-white py-20 sm:py-24" id="how-it-works">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
        <div className="relative min-h-[420px] overflow-hidden rounded-[6px] bg-deep sm:min-h-[560px]">
          <img
            alt={storefrontMedia.process.alt}
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            loading="lazy"
            src={storefrontMedia.process.src}
          />
          <div className="absolute inset-x-0 bottom-0 bg-[#10251de6] p-6 text-white sm:p-8">
            <p className="text-sm font-bold text-sun">One connected workflow</p>
            <p className="storefront-display mt-2 text-2xl leading-tight sm:text-3xl">
              From this week&apos;s market to the delivery timeline.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-coral">How it works</p>
          <h2 className="storefront-display mt-3 text-4xl leading-tight sm:text-5xl">
            Grocery shopping without the scattered steps.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Carbon keeps your plan, basket, delivery selection, payment readiness, and order history
            together while the server owns every commerce decision.
          </p>
          <ol className="mt-10 divide-y divide-line border-y border-line">
            {steps.map(({ icon: Icon, number, title, description }) => (
              <li className="grid grid-cols-[auto_1fr] gap-4 py-6" key={number}>
                <span className="grid size-11 place-items-center bg-soft text-deep">
                  <Icon aria-hidden="true" size={21} />
                </span>
                <div>
                  <p className="text-xs font-bold text-coral">{number}</p>
                  <h3 className="mt-1 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

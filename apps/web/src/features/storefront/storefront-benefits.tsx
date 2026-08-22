import { CalendarCheck, PackageCheck, Route } from "lucide-react";

const benefits = [
  {
    icon: CalendarCheck,
    title: "Built for the week",
    description: "Choose a plan, edit your basket, and work toward one clear order cutoff.",
  },
  {
    icon: PackageCheck,
    title: "Market prices you can trust",
    description: "Catalog prices, credits, fees, and totals are always resolved by the server.",
  },
  {
    icon: Route,
    title: "Delivery with a rhythm",
    description: "Select an available window and follow your order from packing to delivery.",
  },
] as const;

export function StorefrontBenefits() {
  return (
    <section aria-label="Shopping benefits" className="border-b border-line bg-white">
      <div className="mx-auto grid max-w-[1240px] divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
        {benefits.map(({ icon: Icon, title, description }) => (
          <article className="flex gap-4 py-7 md:px-6 md:first:pl-0 md:last:pr-0" key={title}>
            <span className="grid size-11 shrink-0 place-items-center bg-soft text-deep">
              <Icon aria-hidden="true" size={21} />
            </span>
            <div>
              <h2 className="text-base font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

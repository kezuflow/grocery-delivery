import { CalendarCheck, PackageCheck, Route } from "lucide-react";

const benefits = [
  {
    icon: "calendar",
    number: "01",
    title: "A basket that fits the week",
    description: "Choose a plan, keep editing your basket, and work toward one clear cutoff.",
  },
  {
    icon: "package",
    number: "02",
    title: "The total stays trustworthy",
    description: "Catalog prices, credits, fees, and totals are resolved by the server.",
  },
  {
    icon: "route",
    number: "03",
    title: "Delivery has a clear rhythm",
    description: "Select an available window and follow the order from packing to delivery.",
  },
] as const;

export function StorefrontBenefits() {
  return (
    <section aria-label="Shopping benefits" className="border-b border-line bg-paper">
      <div className="mx-auto grid max-w-[1240px] divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
        {benefits.map(({ icon, number, title, description }) => (
          <article
            className="grid gap-6 py-8 md:px-7 md:py-10 md:first:pl-0 md:last:pr-0"
            key={title}
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-deep">
                {icon === "calendar" ? <CalendarCheck aria-hidden="true" size={21} /> : null}
                {icon === "package" ? <PackageCheck aria-hidden="true" size={21} /> : null}
                {icon === "route" ? <Route aria-hidden="true" size={21} /> : null}
              </span>
              <span className="text-xs font-bold tracking-[0.16em] text-coral">{number}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

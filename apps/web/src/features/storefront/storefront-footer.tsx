import { Leaf, Mail } from "lucide-react";

const links = [
  { href: "#market", label: "Weekly market" },
  { href: "#plans", label: "Plans" },
  { href: "#how-it-works", label: "How it works" },
  { href: "mailto:support@getscenepass.com", label: "Support" },
] as const;

export function StorefrontFooter() {
  return (
    <footer className="bg-[#14261f] text-white">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center bg-sun text-ink">
              <Leaf aria-hidden="true" size={19} />
            </span>
            <strong>Carbon Food Delivery</strong>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            A weekly grocery market with server-confirmed pricing, practical delivery windows, and
            one place to manage every order.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-bold text-white/80">
            {links.map((link) => (
              <li key={link.href}>
                <a className="hover:text-sun" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-white/15 pt-6 text-xs leading-6 text-white/55 md:col-span-2 md:flex md:items-center md:justify-between">
          <p>
            Plan availability, prices, credits, fees, and delivery windows are server-confirmed.
          </p>
          <a
            className="mt-3 inline-flex items-center gap-2 font-bold text-white/80 hover:text-sun md:mt-0"
            href="mailto:support@getscenepass.com"
          >
            <Mail aria-hidden="true" size={15} />
            support@getscenepass.com
          </a>
        </div>
      </div>
    </footer>
  );
}

export function BrandLink({ tone = "default" }: Readonly<{ tone?: "default" | "inverse" }>) {
  return (
    <a
      className={`inline-flex items-center gap-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep ${tone === "inverse" ? "text-white" : "text-ink"}`}
      href="/"
      aria-label="Carbon Food Delivery home"
    >
      <span
        aria-hidden="true"
        className={`grid size-9 place-items-center rounded-full text-sm ${tone === "inverse" ? "bg-white text-market-green" : "bg-deep text-white"}`}
      >
        C
      </span>
      <span>Carbon</span>
    </a>
  );
}

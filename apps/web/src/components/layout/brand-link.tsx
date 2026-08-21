export function BrandLink() {
  return (
    <a
      className="inline-flex items-center gap-2 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep"
      href="/"
      aria-label="Carbon Food Delivery home"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full bg-deep text-sm text-white"
      >
        C
      </span>
      <span>Carbon</span>
    </a>
  );
}

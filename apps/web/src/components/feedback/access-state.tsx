import { LinkButton } from "../ui";

export function AccessState({
  title,
  description,
  actionLabel = "Return home",
  actionHref = "/",
}: Readonly<{
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}>) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-12 text-ink sm:px-8">
      <section className="grid w-full max-w-xl gap-4 border border-line bg-white p-8" role="status">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Carbon Food Delivery
        </p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm leading-6 text-muted">{description}</p>
        <div>
          <LinkButton href={actionHref} size="sm">
            {actionLabel}
          </LinkButton>
        </div>
      </section>
    </main>
  );
}

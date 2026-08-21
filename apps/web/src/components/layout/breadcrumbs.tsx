export type Breadcrumb = Readonly<{ href?: string; label: string }>;

export function Breadcrumbs({ items }: Readonly<{ items: readonly Breadcrumb[] }>) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <a
                className="hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
                href={item.href}
              >
                {item.label}
              </a>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

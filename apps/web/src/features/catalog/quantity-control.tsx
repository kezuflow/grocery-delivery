export function QuantityControl({
  label,
  quantity,
  onChange,
}: Readonly<{ label: string; quantity: number; onChange: (quantity: number) => void }>) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button
        aria-label={`Decrease ${label}`}
        className="grid size-8 place-items-center rounded border border-line text-lg font-bold text-ink hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
        onClick={() => onChange(quantity - 1)}
        type="button"
      >
        -
      </button>
      <input
        aria-label={label}
        className="h-8 w-12 rounded border border-line text-center text-sm font-bold outline-none focus-visible:border-deep focus-visible:ring-2 focus-visible:ring-accent"
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={quantity}
      />
      <button
        aria-label={`Increase ${label}`}
        className="grid size-8 place-items-center rounded border border-line text-lg font-bold text-ink hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
        onClick={() => onChange(quantity + 1)}
        type="button"
      >
        +
      </button>
    </div>
  );
}

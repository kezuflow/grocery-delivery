export function QuantityControl({
  label,
  quantity,
  onChange,
  disabled = false,
}: Readonly<{
  label: string;
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
}>) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button
        aria-label={`Decrease ${label}`}
        className="grid size-10 shrink-0 place-items-center rounded border border-line text-lg font-bold text-ink hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled}
        type="button"
      >
        -
      </button>
      <input
        aria-label={label}
        className="h-10 w-14 rounded border border-line text-center text-sm font-bold outline-none focus-visible:border-deep focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        type="number"
        value={quantity}
      />
      <button
        aria-label={`Increase ${label}`}
        className="grid size-10 shrink-0 place-items-center rounded border border-line text-lg font-bold text-ink hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled}
        type="button"
      >
        +
      </button>
    </div>
  );
}

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";

import { cn } from "./cn";

const adminStatusTone: Record<string, string> = {
  success: "bg-admin-success-soft text-admin-accent",
  active: "bg-admin-success-soft text-admin-accent",
  ready: "bg-admin-success-soft text-admin-accent",
  approved: "bg-admin-success-soft text-admin-accent",
  warning: "bg-amber-50 text-amber-800",
  pending: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
  accent: "bg-admin-accent-soft text-admin-accent",
};

export function AdminStatus({ status }: Readonly<{ status: string }>) {
  const normalized = status.trim().toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize",
        adminStatusTone[normalized] ?? "bg-admin-surface-subtle text-admin-text-secondary",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: Readonly<{ title: string; description?: ReactNode; action?: ReactNode }>) {
  return (
    <section className="grid min-h-28 content-center gap-2 border-t border-admin-border px-5 py-7">
      <h2 className="text-sm font-semibold text-admin-text-primary">{title}</h2>
      {description ? (
        <p className="max-w-[65ch] text-sm leading-5 text-admin-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}

export function AdminErrorState({
  title,
  description,
}: Readonly<{ title: string; description?: ReactNode }>) {
  return (
    <section
      className="grid min-h-28 content-center gap-2 border-t border-red-200 bg-red-50/60 px-5 py-7"
      role="alert"
    >
      <h2 className="text-sm font-semibold text-red-800">{title}</h2>
      {description ? (
        <p className="max-w-[65ch] text-sm leading-5 text-red-700">{description}</p>
      ) : null}
    </section>
  );
}

export function AdminPanel({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("border border-admin-border bg-admin-surface", className)} {...props}>
      {children}
    </section>
  );
}

export function AdminPanelHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{ eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }>) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-admin-border px-4 py-4 sm:px-5">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-admin-text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold text-admin-text-primary">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[70ch] text-sm leading-5 text-admin-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function AdminToolbar({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-admin-border bg-admin-surface-subtle px-4 py-3 sm:px-5">
      {children}
    </div>
  );
}

export function AdminTabs({
  tabs,
  active,
  onChange,
}: Readonly<{ tabs: readonly string[]; active: string; onChange?: (tab: string) => void }>) {
  return (
    <div className="flex gap-5 border-b border-admin-border px-1" role="tablist">
      {tabs.map((tab) => (
        <button
          aria-selected={active === tab}
          className={cn(
            "border-b-2 px-1 py-3 text-sm font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent",
            active === tab
              ? "border-admin-accent text-admin-text-primary"
              : "border-transparent text-admin-text-muted hover:text-admin-text-primary",
          )}
          key={tab}
          onClick={() => onChange?.(tab)}
          role="tab"
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function AdminSettingGroup({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: ReactNode; children: ReactNode }>) {
  return (
    <section className="border-b border-admin-border py-6 last:border-b-0">
      <div className="grid gap-1 sm:grid-cols-[minmax(10rem,.32fr)_minmax(0,1fr)] sm:gap-8">
        <div>
          <h3 className="text-sm font-semibold text-admin-text-primary">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-admin-text-muted">{description}</p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 sm:mt-0">{children}</div>
      </div>
    </section>
  );
}

export function AdminSaveBar({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border bg-admin-surface/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
      {children}
    </div>
  );
}

export function AdminButton({
  tone = "primary",
  loading = false,
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const toneClass = {
    primary: "bg-admin-accent text-white hover:bg-admin-accent-hover",
    secondary:
      "border border-admin-border-strong bg-admin-surface text-admin-text-primary hover:bg-admin-surface-hover",
    ghost: "text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text-primary",
    danger: "border border-red-200 text-red-700 hover:bg-red-50",
  }[tone];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "min-h-8 px-2.5 text-xs" : size === "lg" ? "min-h-11 px-4" : "min-h-9 px-3",
        toneClass,
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? "Saving..." : children}
    </button>
  );
}

type AdminFieldMessage = Readonly<{ label?: ReactNode; hint?: ReactNode; error?: ReactNode }>;

function AdminField({
  id,
  label,
  hint,
  error,
  children,
}: AdminFieldMessage & { id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {label ? (
        <label className="text-xs font-semibold text-admin-text-primary" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-red-700" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-4 text-admin-text-muted" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const adminFieldClass =
  "min-h-9 w-full rounded-md border border-admin-border-strong bg-admin-surface px-3 py-2 text-sm text-admin-text-primary outline-none transition-colors placeholder:text-admin-text-muted focus:border-admin-accent focus:ring-2 focus:ring-admin-accent-soft disabled:cursor-not-allowed disabled:bg-admin-surface-subtle disabled:text-admin-text-muted";

export function AdminInput({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & AdminFieldMessage) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <AdminField id={fieldId} label={label} hint={hint} error={error}>
      <input
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        aria-invalid={Boolean(error)}
        className={cn(adminFieldClass, className)}
        id={fieldId}
        {...props}
      />
    </AdminField>
  );
}

export function AdminSelect({
  id,
  label,
  hint,
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & AdminFieldMessage) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <AdminField id={fieldId} label={label} hint={hint} error={error}>
      <select
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        aria-invalid={Boolean(error)}
        className={cn(adminFieldClass, className)}
        id={fieldId}
        {...props}
      >
        {children}
      </select>
    </AdminField>
  );
}

export function AdminTextarea({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & AdminFieldMessage) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <AdminField id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        aria-invalid={Boolean(error)}
        className={cn(adminFieldClass, "min-h-24 resize-y", className)}
        id={fieldId}
        {...props}
      />
    </AdminField>
  );
}

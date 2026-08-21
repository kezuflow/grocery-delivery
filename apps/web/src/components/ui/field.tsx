import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "./cn";

type FieldMessageProps = Readonly<{
  id?: string | undefined;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}>;

function FieldMessage({ id, label, hint, error }: FieldMessageProps) {
  return (
    <>
      {label ? (
        <label className="text-sm font-bold text-ink" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {error ? (
        <p className="text-xs text-red-800" id={id ? `${id}-error` : undefined} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted" id={id ? `${id}-hint` : undefined}>
          {hint}
        </p>
      ) : null}
    </>
  );
}

function fieldClassName(className?: string) {
  return cn(
    "min-h-11 w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus-visible:border-deep focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-black/5 disabled:opacity-60",
    className,
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldMessageProps;

export function Input({ id, label, hint, error, className, ...props }: InputProps) {
  const describedBy = id ? (error ? `${id}-error` : hint ? `${id}-hint` : undefined) : undefined;

  return (
    <div className="grid gap-1.5">
      <FieldMessage id={id} label={label} hint={hint} error={error} />
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={fieldClassName(className)}
        id={id}
        {...props}
      />
    </div>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldMessageProps;

export function Select({ id, label, hint, error, className, children, ...props }: SelectProps) {
  const describedBy = id ? (error ? `${id}-error` : hint ? `${id}-hint` : undefined) : undefined;

  return (
    <div className="grid gap-1.5">
      <FieldMessage id={id} label={label} hint={hint} error={error} />
      <select
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={fieldClassName(className)}
        id={id}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMessageProps;

export function Textarea({ id, label, hint, error, className, ...props }: TextareaProps) {
  const describedBy = id ? (error ? `${id}-error` : hint ? `${id}-hint` : undefined) : undefined;

  return (
    <div className="grid gap-1.5">
      <FieldMessage id={id} label={label} hint={hint} error={error} />
      <textarea
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cn(fieldClassName(className), "min-h-28 resize-y")}
        id={id}
        {...props}
      />
    </div>
  );
}

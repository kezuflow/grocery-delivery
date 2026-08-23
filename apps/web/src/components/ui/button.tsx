import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type ButtonTone = "primary" | "secondary" | "accent" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const toneClasses: Record<ButtonTone, string> = {
  primary: "bg-base-action !text-white hover:bg-base-action-hover",
  secondary: "border border-deep bg-transparent text-deep hover:bg-accent/30",
  accent: "bg-accent-dark text-paper hover:bg-accent-dark",
  danger: "border border-red-700 bg-transparent text-red-800 hover:bg-red-50",
  ghost: "bg-transparent text-muted hover:bg-black/5 hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function buttonClassName({
  tone = "primary",
  size = "md",
  className,
}: Readonly<{
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string | undefined;
}>) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-50",
    toneClasses[tone],
    sizeClasses[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  tone = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ tone, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}

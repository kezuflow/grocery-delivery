import type { AnchorHTMLAttributes, ReactNode } from "react";

import { buttonClassName, type ButtonSize, type ButtonTone } from "./button";

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  children: ReactNode;
};

export function LinkButton({
  tone = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <a className={buttonClassName({ tone, size, className })} {...props}>
      {children}
    </a>
  );
}

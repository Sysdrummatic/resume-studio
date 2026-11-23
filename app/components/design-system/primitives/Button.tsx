"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClassName, type ButtonVariant } from "./buttonClassName";
import { cx } from "./cx";

export type { ButtonVariant };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "small";
  busy?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "default",
  busy = false,
  icon,
  type = "button",
  className,
  onClick,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClassName(variant, size), className)}
      {...props}
      aria-disabled={busy ? true : props["aria-disabled"]}
      aria-busy={busy ? true : props["aria-busy"]}
      onClick={(event) => {
        // Click is what Enter, Space and implicit submission dispatch, so this also stops the submit.
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

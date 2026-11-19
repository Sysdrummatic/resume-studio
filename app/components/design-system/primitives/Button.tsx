import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "small";
  busy?: boolean;
  icon?: ReactNode;
}

export function buttonClassName(variant: ButtonVariant = "secondary", size: "default" | "small" = "default") {
  return cx(
    "ocv-btn",
    variant !== "secondary" && `ocv-btn--${variant}`,
    size === "small" && "ocv-btn--small",
  );
}

export function Button({
  variant = "secondary",
  size = "default",
  busy = false,
  icon,
  type = "button",
  className,
  disabled,
  onClick,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClassName(variant, size), className)}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

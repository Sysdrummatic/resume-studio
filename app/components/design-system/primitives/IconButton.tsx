import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, type = "button", className, children, ...props }: IconButtonProps) {
  return (
    <button type={type} className={cx("ocv-icon-btn", className)} aria-label={label} title={label} {...props}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

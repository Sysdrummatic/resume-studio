import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cx("ocv-check", className)}>
      <input type="checkbox" className="ocv-check__box" {...props} />
      <span>{label}</span>
    </label>
  );
}

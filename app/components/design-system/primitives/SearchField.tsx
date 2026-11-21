import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "aria-label"> {
  label: string;
  fieldClassName?: string;
}

export function SearchField({ label, fieldClassName, className, ...props }: SearchFieldProps) {
  return (
    <label className={cx("ocv-search", fieldClassName)}>
      <svg
        className="ocv-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" className={cx("ocv-search__input", className)} aria-label={label} {...props} />
    </label>
  );
}

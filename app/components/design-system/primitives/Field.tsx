"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({ label, hint, error, id, className, children }: FieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("ocv-field", className)}>
      <label className="ocv-label" htmlFor={controlId}>
        {label}
      </label>
      {children({ id: controlId, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint ? (
        <span id={hintId} className="ocv-field__hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="ocv-field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

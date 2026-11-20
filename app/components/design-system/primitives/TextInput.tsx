"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { Field, type FieldControlProps } from "./Field";

interface FieldChrome {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
}

interface CallerAria {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

function withControl<T extends CallerAria>(props: T, control: FieldControlProps) {
  const describedBy = [control["aria-describedby"], props["aria-describedby"]].filter(Boolean).join(" ");
  return {
    ...props,
    id: control.id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": control["aria-invalid"] ?? props["aria-invalid"],
  };
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & FieldChrome;

export function TextInput({ label, hint, error, fieldClassName, id, className, ...props }: TextInputProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={fieldClassName}>
      {(control) => <input className={cx("ocv-input", className)} {...withControl(props, control)} />}
    </Field>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldChrome;

export function Select({ label, hint, error, fieldClassName, id, className, children, ...props }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={fieldClassName}>
      {(control) => (
        <select className={cx("ocv-input", className)} {...withControl(props, control)}>
          {children}
        </select>
      )}
    </Field>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome;

export function Textarea({ label, hint, error, fieldClassName, id, className, rows = 4, ...props }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={fieldClassName}>
      {(control) => <textarea className={cx("ocv-input", className)} rows={rows} {...withControl(props, control)} />}
    </Field>
  );
}

import type { ReactNode } from "react";
import { cx } from "./cx";

export interface ToastProps {
  tone?: "default" | "changes" | "danger";
  children: ReactNode;
  className?: string;
}

export function Toast({ tone = "default", children, className }: ToastProps) {
  return (
    <div
      className={cx("ocv-toast", className)}
      data-tone={tone === "default" ? undefined : tone}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

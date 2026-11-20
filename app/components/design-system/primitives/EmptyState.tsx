import type { ReactNode } from "react";
import { cx } from "./cx";

export interface EmptyStateProps {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cx("ocv-empty", className)}>
      <p className="ocv-subheading">{title}</p>
      {children ? <p className="ocv-meta">{children}</p> : null}
      {action}
    </div>
  );
}

import type { ReactNode } from "react";
import { cx } from "./cx";

export interface PaperProps {
  name?: ReactNode;
  role?: ReactNode;
  contact?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Paper({ name, role, contact, children, className }: PaperProps) {
  return (
    <div className={cx("ocv-paper", className)}>
      <div className="ocv-paper__sheet">
        {name || role || contact ? (
          <div className="ocv-paper__header">
            {name ? <span className="ocv-paper__name">{name}</span> : null}
            {role ? <span className="ocv-paper__role">{role}</span> : null}
            {contact ? <span className="ocv-paper__contact">{contact}</span> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export interface PaperSectionProps {
  title: ReactNode;
  children: ReactNode;
}

export function PaperSection({ title, children }: PaperSectionProps) {
  return (
    <div className="ocv-paper__section">
      <p className="ocv-paper__section-title">{title}</p>
      {children}
    </div>
  );
}

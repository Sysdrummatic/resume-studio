import type { ReactNode } from "react";
import { cx } from "./cx";

export type PillState = "private" | "public" | "ok" | "changes";

export interface StatePillProps {
  state: PillState;
  children: ReactNode;
  className?: string;
}

export function StatePill({ state, children, className }: StatePillProps) {
  return (
    <span className={cx("ocv-state", className)} data-state={state}>
      {children}
    </span>
  );
}

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "aside";
  traced?: false | "public" | "private";
}

export function Panel({ as: Tag = "div", traced = false, className, ...props }: PanelProps) {
  return (
    <Tag
      className={cx("ocv-panel", traced && "ocv-traced", className)}
      data-trace={traced === "private" ? "private" : undefined}
      {...props}
    />
  );
}

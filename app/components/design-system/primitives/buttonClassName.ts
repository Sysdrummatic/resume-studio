import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

// Server-safe on purpose: lets a server component style a link as a button.
export function buttonClassName(variant: ButtonVariant = "secondary", size: "default" | "small" = "default") {
  return cx("ocv-btn", variant !== "secondary" && `ocv-btn--${variant}`, size === "small" && "ocv-btn--small");
}

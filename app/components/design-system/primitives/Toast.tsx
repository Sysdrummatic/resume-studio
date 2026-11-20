"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

// Screen readers skip text inserted together with its live region, so the regions are created once,
// empty, and kept in <body>; the message is written a moment later. Clearing first makes an
// identical message a change again.
const ANNOUNCE_DELAY_MS = 100;
const regions = new Map<"status" | "alert", { element: HTMLElement; timer?: number }>();

function announce(text: string, role: "status" | "alert") {
  let region = regions.get(role);
  if (!region || !region.element.isConnected) {
    const element = document.createElement("div");
    element.className = "ocv-live ocv-sr-only";
    element.setAttribute("role", role);
    document.body.append(element);
    region = { element };
    regions.set(role, region);
  }
  const current = region;
  window.clearTimeout(current.timer);
  current.element.textContent = "";
  current.timer = window.setTimeout(() => (current.element.textContent = text), ANNOUNCE_DELAY_MS);
}

export interface ToastProps {
  tone?: "default" | "changes" | "danger";
  children: ReactNode;
  className?: string;
}

/** Announced on mount and when its text changes; give each new message its own `key` to repeat identical text. */
export function Toast({ tone = "default", children, className }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null);
  const announced = useRef<string | undefined>(undefined);
  const role = tone === "danger" ? "alert" : "status";

  useEffect(() => {
    const text = ref.current?.textContent?.trim();
    if (!text || announced.current === role + text) return;
    announced.current = role + text;
    announce(text, role);
  });
  // Strict Mode remounts once in development: forget what was announced so the remount re-queues it.
  useEffect(
    () => () => {
      announced.current = undefined;
    },
    [],
  );

  return (
    <div ref={ref} className={cx("ocv-toast", className)} data-tone={tone === "default" ? undefined : tone}>
      {children}
    </div>
  );
}

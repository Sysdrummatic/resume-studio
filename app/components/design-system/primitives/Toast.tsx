"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

// Screen readers skip text inserted together with its live region, so a region is created once,
// empty, and kept; the message is written a moment later. Clearing first makes an identical message
// a change again. The region lives in <body>, or inside the modal the toast belongs to, because
// everything outside a modal <dialog> is inert and would not be announced. The dialog is matched
// whether or not it is open yet: a child's effect runs before the Modal's showModal() effect.
const ANNOUNCE_DELAY_MS = 100;
const timers = new WeakMap<HTMLElement, number>();

function announce(text: string, role: "status" | "alert", container: HTMLElement) {
  let region = container.querySelector<HTMLElement>(`:scope > .ocv-live[role="${role}"]`);
  if (!region) {
    region = document.createElement("div");
    region.className = "ocv-live ocv-sr-only";
    region.setAttribute("role", role);
    container.append(region);
  }
  const target = region;
  window.clearTimeout(timers.get(target));
  target.textContent = "";
  timers.set(target, window.setTimeout(() => (target.textContent = text), ANNOUNCE_DELAY_MS));
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
    announce(text, role, ref.current?.closest<HTMLElement>("dialog") ?? document.body);
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

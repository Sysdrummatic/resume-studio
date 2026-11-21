"use client";

import { useEffect, useRef } from "react";
import styles from "./floating-sheets.module.css";

const SHEETS = 7;

/**
 * Loose CV sheets drifting slowly behind the login form (epic #190, issue #290).
 * Decorative only. The drift pauses on a hidden tab; reduced motion shows them still.
 */
export default function FloatingSheets() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const sync = () => {
      element.dataset.idle = document.hidden ? "paused" : "run";
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div ref={ref} className={styles.sheets} aria-hidden="true" data-idle="run">
      {Array.from({ length: SHEETS }, (_, index) => (
        <div key={index} className={styles.sheet}>
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

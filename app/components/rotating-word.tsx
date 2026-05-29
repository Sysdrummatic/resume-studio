"use client";

import { useEffect, useState } from "react";

type RotatingWordProps = {
  /** Words to cycle through. Edit this list to add/remove/reorder. */
  words: string[];
  /** How long each word stays visible, in milliseconds. */
  interval?: number;
  className?: string;
};

/**
 * Animated word carousel. Cycles through `words`, cross-fading between them.
 * All words are stacked in one grid cell so the slot sizes to the widest word
 * and surrounding text never reflows.
 */
export default function RotatingWord({ words, interval = 2200, className }: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [words, interval]);

  if (words.length === 0) return null;

  return (
    <span className={className ? `lp-rot ${className}` : "lp-rot"}>
      {/* Static, screen-reader-only word keeps the heading readable. */}
      <span className="lp-sr-only">{words[0]}</span>
      <span className="lp-rot__track" aria-hidden="true">
        {words.map((word, i) => (
          <span key={word} className={i === index ? "lp-rot__word is-active" : "lp-rot__word"}>
            {word}
          </span>
        ))}
      </span>
    </span>
  );
}

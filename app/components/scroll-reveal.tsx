"use client";

import { useEffect } from "react";

/**
 * Reveals elements marked with `data-reveal` inside `.lp` as they scroll into
 * view. Renders no DOM of its own.
 *
 * Progressive enhancement: the hidden start state is gated behind the
 * `lp--reveal-ready` class this adds, so without JS (and for crawlers) the
 * content stays fully visible. Elements already in the viewport are revealed
 * in the same synchronous pass that enables the ready class, so on-screen
 * content never flashes hidden between paints.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lp");
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (targets.length === 0) return;

    root.classList.add("lp--reveal-ready");

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    const viewportHeight = window.innerHeight;
    const pending: HTMLElement[] = [];
    for (const element of targets) {
      if (element.getBoundingClientRect().top < viewportHeight) {
        element.classList.add("is-revealed");
      } else {
        pending.push(element);
      }
    }

    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    pending.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}

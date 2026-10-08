"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { AppDictionary } from "../i18n/types";
import styles from "../landing.module.css";

type Features = AppDictionary["landing"]["features"];

export default function LandingFeatures({ labels }: { labels: Features }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group || paused || hovered || focused) return;
    const motion = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (prefers-reduced-motion: no-preference)"
    );
    let frame = 0;
    let previousTime = 0;
    let position = viewport.scrollLeft;
    let visible = false;
    const tick = (time: number) => {
      if (previousTime) {
        const distance = group.offsetWidth;
        position += Math.min(time - previousTime, 50) * 0.03;
        if (distance && position >= distance) position -= distance;
        viewport.scrollLeft = position;
      }
      previousTime = time;
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      previousTime = 0;
      position = viewport.scrollLeft;
      if (motion.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(viewport);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [paused, hovered, focused]);

  const cards = (duplicate: boolean) =>
    labels.items.map((item) => (
      <li key={item.title} className={styles.featureCard} tabIndex={duplicate ? undefined : 0}>
        <div className={styles.cardTag}>{item.tag}</div>
        <span className={styles.chip}>{item.chip}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </li>
    ));

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-label={labels.aria_label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className={styles.carouselControls}>
        <button
          type="button"
          className={styles.secondaryAction}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
          {paused ? labels.resume : labels.pause}
        </button>
      </div>
      <div className={styles.carouselViewport} ref={viewportRef}>
        <div className={styles.carouselTrack}>
          <ul className={styles.carouselGroup} ref={groupRef}>
            {cards(false)}
          </ul>
          <ul className={`${styles.carouselGroup} ${styles.carouselDuplicate}`} aria-hidden="true">
            {cards(true)}
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { SectionStatus } from "./resume-completion";

export type EditorNavSection = { id: string; label: string; count?: number | null; status?: SectionStatus | null };
export type EditorNavGroup = { label: string; numbered?: boolean; sections: EditorNavSection[] };

type EditorSectionNavProps = {
  groups: EditorNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
};

// Paths are the 24x24 outline set from the approved editor mockup. Numbered
// groups show an ordinal badge instead, so only the unnumbered sections need one.
const SECTION_ICON_PATHS: Record<string, string> = {
  courses: "M12 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z M9 13.8l-1 7.2 4-2.4 4 2.4-1-7.2",
  interests: "M12 20.5S4.5 16 4.5 10.8A3.9 3.9 0 0 1 12 8.4a3.9 3.9 0 0 1 7.5 2.4c0 5.2-7.5 9.7-7.5 9.7Z",
  "tech-stack": "M2.5 6a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2Z M7 10l2.5 2.5L7 15 M12.5 15H17",
  "qr-codes": "M3.5 4.5a1 1 0 0 1 1-1h4.5a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1Z M14 4.5a1 1 0 0 1 1-1h4.5a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1H15a1 1 0 0 1-1-1Z M3.5 15a1 1 0 0 1 1-1h4.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1Z M14 14h3v3h-3z M17.5 17.5h3v3h-3z",
  gdpr: "M12 3.5 5 6.3v5.4c0 4.3 2.9 7.2 7 8.8 4.1-1.6 7-4.5 7-8.8V6.3l-7-2.8Z M9.3 12l1.9 1.9 3.5-3.6",
  publishing: "M12 20V5 M5.5 11.5 12 5l6.5 6.5 M4 20h16",
};

function SectionIcon({ id }: { id: string }) {
  const path = SECTION_ICON_PATHS[id];
  if (!path) return null;
  return (
    <svg
      className="resume-editor-nav__icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

// Works in both editor modes: in the human-friendly editor it swaps which
// section the workspace renders; in the YAML editor it jumps the caret to the
// matching block. See `handleSectionNavSelect` in editor-canvas-client.tsx.
export default function EditorSectionNav({ groups, activeId, onSelect }: EditorSectionNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  // The highlight is a single element that slides between items rather than a
  // background on each one, so switching sections reads as one movement.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>(".resume-editor-nav__item.is-active");
    if (!nav || !active) {
      setIndicator(null);
      return;
    }

    function measure() {
      if (!nav || !active) return;
      setIndicator({ top: active.offsetTop, height: active.offsetHeight });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeId, groups]);

  let ordinal = 0;

  return (
    <nav className="resume-editor-nav" aria-label="Resume sections" ref={navRef}>
      {indicator ? (
        <span
          className="resume-editor-nav__indicator"
          aria-hidden="true"
          style={{ transform: `translateY(${indicator.top}px)`, height: `${indicator.height}px` }}
        />
      ) : null}
      {groups.map((group) => (
        <div className="resume-editor-nav__group" key={group.label}>
          <div className="resume-editor-nav__group-label">{group.label}</div>
          {group.sections.map((section) => {
            const number = group.numbered ? ++ordinal : null;
            return (
              <button
                key={section.id}
                type="button"
                className={`resume-editor-nav__item ${activeId === section.id ? "is-active" : ""}`}
                aria-current={activeId === section.id}
                onClick={() => onSelect(section.id)}
              >
                {number === null ? <SectionIcon id={section.id} /> : <span className="resume-editor-nav__number">{number}</span>}
                <span className="resume-editor-nav__label">{section.label}</span>
                {section.count === null || section.count === undefined ? null : (
                  <span className="resume-editor-nav__count">{section.count}</span>
                )}
                {section.status ? (
                  <span
                    className="resume-editor-nav__status"
                    data-status={section.status}
                    title={section.status === "ok" ? "Complete" : "Needs content"}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

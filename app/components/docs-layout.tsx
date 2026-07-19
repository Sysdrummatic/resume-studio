"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { DESKTOP_NAVIGATION_BREAKPOINT_QUERY } from "./app-header-navigation";
import type { DocNavGroup } from "../lib/docs/content";
import type { DocHeading } from "../lib/docs/markdown";

type Props = {
  groups: DocNavGroup[];
  activeHref: string;
  toc?: DocHeading[];
  children: ReactNode;
};

export default function DocsLayout({ groups, activeHref, toc = [], children }: Props) {
  const [isCompact, setIsCompact] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const updateMode = useCallback(() => {
    const nextIsCompact = !window.matchMedia(DESKTOP_NAVIGATION_BREAKPOINT_QUERY).matches;

    setIsCompact(nextIsCompact);
    if (!nextIsCompact) {
      setIsMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateMode);
    window.addEventListener("resize", updateMode);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateMode);
    };
  }, [updateMode]);

  const sidebarNav = (
    <nav className="docs-shell__nav" aria-label="Docs">
      {groups.map((group) => (
        <div key={group.key} className="docs-shell__group">
          <span className="docs-shell__group-title">{group.title}</span>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`docs-shell__nav-link${item.href === activeHref ? " docs-shell__nav-link--active" : ""}`}
              aria-current={item.href === activeHref ? "page" : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.title}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className={`docs-shell${isCompact ? " docs-shell--compact" : ""}`}>
      {isCompact ? (
        <div className="docs-shell__mobile-nav">
          <button
            type="button"
            className="app-nav__action"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            Docs menu
          </button>
          {isMenuOpen ? <div className="card">{sidebarNav}</div> : null}
        </div>
      ) : (
        <aside className="docs-shell__sidebar">{sidebarNav}</aside>
      )}
      <div className="docs-shell__content">{children}</div>
      {!isCompact && toc.length > 0 ? (
        <aside className="docs-shell__rail" aria-label="On this page">
          <span className="docs-shell__group-title">On this page</span>
          <ul className="docs-shell__toc">
            {toc.map((heading) => (
              <li key={heading.slug} className={heading.depth === 3 ? "docs-shell__toc-item--nested" : undefined}>
                <a href={`#${heading.slug}`} className="docs-shell__nav-link">
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}

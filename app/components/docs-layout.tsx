"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, FileText, Grid2X2, Menu } from "lucide-react";
import { DESKTOP_NAVIGATION_BREAKPOINT_QUERY } from "./app-header-navigation";
import WorkspaceBreadcrumbs from "./workspace-breadcrumbs";
import type { DocNavGroup } from "../lib/docs/content";
import type { DocHeading } from "../lib/docs/markdown";
import {
  buildDocsSections,
  buildDocsTopics,
  docsHref,
  FIRST_CV_GUIDE
} from "../lib/docs/presentation";
import { formatAppMessage } from "../i18n/locale";
import type { AppDictionary } from "../i18n/types";

type Props = {
  groups: DocNavGroup[];
  activeHref: string;
  toc?: DocHeading[];
  locale: string;
  copy: AppDictionary["docs"];
  children: ReactNode;
};

export default function DocsLayout({
  groups,
  activeHref,
  toc = [],
  locale,
  copy,
  children
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const topics = buildDocsTopics(groups, copy);
  const sections = buildDocsSections(groups, copy);
  const stepIndex = topics.findIndex((topic) => topic.href === activeHref);
  const stepLabel =
    stepIndex >= 0
      ? formatAppMessage(copy.workflow.step, { step: topics[stepIndex].step, total: topics.length })
      : "";
  const previous = topics[stepIndex - 1];
  const next = topics[stepIndex + 1];
  const activeGroup = groups.find((group) => group.items.some((item) => item.href === activeHref));
  const activeItem = activeGroup?.items.find((item) => item.href === activeHref);
  const parents = [
    { label: copy.home, href: "/" },
    ...(activeItem && activeGroup
      ? [
          { label: copy.title, href: docsHref("/docs") },
          { label: activeGroup.key === "test-scenarios" ? copy.test_scenarios : copy.tutorials }
        ]
      : [])
  ];

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_NAVIGATION_BREAKPOINT_QUERY);
    function closeOnDesktop() {
      if (media.matches) setIsMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
        menuRef.current?.focus();
      }
    }
    media.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      media.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <div className="docs-page editor-theme wide-shell-page" lang={locale}>
      <WorkspaceBreadcrumbs current={activeItem?.title || copy.title} parents={parents} />
      <div className={`docs-workspace${toc.length > 0 ? " docs-workspace--article" : ""}`}>
        <div className="docs-mobile-nav">
          <button
            ref={menuRef}
            type="button"
            className="docs-button"
            aria-expanded={isMenuOpen}
            aria-controls="docs-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <Menu size={16} aria-hidden="true" />
            {copy.menu}
          </button>
          {stepLabel ? <span>{stepLabel}</span> : null}
        </div>
        <aside
          className={`docs-sidebar${isMenuOpen ? " docs-sidebar--open" : ""}`}
          id="docs-navigation"
        >
          <div className="docs-sidebar__inner">
            <div className="docs-sidebar__title">
              <BookOpen size={18} aria-hidden="true" />
              {copy.help_center}
            </div>
            <nav className="docs-nav" aria-label={copy.title}>
              <Link
                href={docsHref("/docs")}
                className={`docs-nav__link${activeHref === "/docs" ? " docs-nav__link--active" : ""}`}
                aria-current={activeHref === "/docs" ? "page" : undefined}
                onClick={() => setIsMenuOpen(false)}
              >
                <Grid2X2 size={15} aria-hidden="true" />
                {copy.overview}
              </Link>
              {sections.map((group) => (
                <div key={group.key} className="docs-nav__group">
                  <span className="docs-nav__label">{group.title}</span>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={docsHref(item.href)}
                      className={`docs-nav__link${item.href === activeHref ? " docs-nav__link--active" : ""}`}
                      aria-current={item.href === activeHref ? "page" : undefined}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.step ? (
                        <span className="docs-nav__number" aria-hidden="true">
                          {item.step}
                        </span>
                      ) : (
                        <FileText size={15} aria-hidden="true" />
                      )}
                      {item.title}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div className="docs-sidebar__footer">
              <strong>{copy.development}</strong>
              <p>{copy.development_note}</p>
            </div>
          </div>
        </aside>
        <div className="docs-content">
          {stepLabel ? (
            <div className="docs-step-context">
              <span>{stepLabel}</span>
              <Link
                className="docs-button"
                href={stepIndex === 0 ? "/master-resume" : "/dashboard"}
              >
                {stepIndex === 0 ? copy.workflow.editor : copy.workflow.dashboard}
              </Link>
            </div>
          ) : null}
          {children}
          {activeItem ? (
            <nav className="docs-step-navigation" aria-label={copy.workflow.navigation}>
              {stepIndex >= 0 ? (
                <>
                  {previous ? (
                    <Link href={previous.href}>
                      <small>
                        <ArrowLeft size={14} aria-hidden="true" />
                        {copy.workflow.previous}
                      </small>
                      {previous.title}
                    </Link>
                  ) : null}
                  {next ? (
                    <Link className="docs-step-navigation__next" href={next.href}>
                      <small>
                        {copy.workflow.next}
                        <ArrowRight size={14} aria-hidden="true" />
                      </small>
                      {next.title}
                    </Link>
                  ) : (
                    <p>{copy.workflow.finished}</p>
                  )}
                </>
              ) : activeHref === FIRST_CV_GUIDE && topics[0] ? (
                <Link className="docs-button docs-button--primary" href={topics[0].href}>
                  {copy.workflow.start}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
              <Link className="docs-step-navigation__back" href="/docs">
                {copy.workflow.back}
              </Link>
            </nav>
          ) : null}
        </div>
        {toc.length > 0 ? (
          <aside className="docs-outline">
            <strong>{copy.outline}</strong>
            <nav aria-label={copy.outline}>
              <ul>
                {toc.map((heading) => (
                  <li
                    key={heading.slug}
                    className={heading.depth === 3 ? "docs-outline__nested" : undefined}
                  >
                    <a href={`#${heading.slug}`}>{heading.text}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

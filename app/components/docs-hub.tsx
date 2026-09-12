"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Flag,
  Globe,
  Layers,
  LockKeyhole,
  Search,
  X
} from "lucide-react";
import type { DocNavGroup } from "../lib/docs/content";
import {
  buildDocsTopics,
  docsCopy,
  docsHref,
  filterDocs,
  FIRST_CV_GUIDE,
  type DocsLanguage
} from "../lib/docs/presentation";

const topicIcons = [FileText, Layers, Globe];

export default function DocsHub({
  groups,
  language = "en",
  children
}: {
  groups: DocNavGroup[];
  language?: DocsLanguage;
  children?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const copy = docsCopy[language];
  const topics = buildDocsTopics(groups, language);
  const visibleTopics = filterDocs(topics, query);
  const documents = groups.flatMap((group) => group.items);
  const visibleDocuments = filterDocs(documents, query);
  const count = visibleTopics.length + visibleDocuments.length;
  const hasGuide = documents.some((item) => item.href === FIRST_CV_GUIDE);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <div className="docs-hub">
      <header className="docs-hub__heading">
        <div>
          <h1>{copy.heading}</h1>
          <p>{copy.lead}</p>
        </div>
        <div className="docs-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            aria-label={copy.search}
            placeholder={copy.placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              aria-label={copy.clear}
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : (
            <kbd aria-hidden="true">Ctrl K</kbd>
          )}
        </div>
      </header>

      {hasGuide ? (
        <section className="docs-feature" aria-labelledby="docs-start-title">
          <div className="docs-feature__copy">
            <span className="docs-tag">
              <Flag size={13} aria-hidden="true" />
              {copy.start}
            </span>
            <h2 id="docs-start-title">{copy.firstCv}</h2>
            <p>{copy.firstCvNote}</p>
            <Link
              className="docs-button docs-button--primary"
              href={docsHref(FIRST_CV_GUIDE, language)}
            >
              {copy.openGuide}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ol className="docs-flow">
            {[
              { title: copy.master, note: copy.masterNote },
              { title: copy.version, note: copy.versionNote },
              { title: copy.published, note: copy.publishedNote }
            ].map((item, index) => {
              const Icon = topicIcons[index];
              return (
                <li key={item.title}>
                  <span className="docs-flow__icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.note}</small>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className="docs-section-heading">
        <h2>{copy.tools}</h2>
        <span role="status">{query.trim() ? `${copy.results}: ${count}` : copy.choose}</span>
      </div>
      {visibleTopics.length > 0 ? (
        <div className="docs-topics">
          {visibleTopics.map((topic) => {
            const Icon = topicIcons[topics.indexOf(topic)];
            return (
              <Link key={topic.href} className="docs-topic" href={topic.href}>
                <Icon size={21} aria-hidden="true" />
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <span>
                  {topic.label}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
      {count === 0 ? (
        <p className="docs-empty">{query.trim() ? copy.noResults : copy.noDocs}</p>
      ) : null}

      <div className="docs-hub__bottom">
        <section>
          <div className="docs-section-heading">
            <h2>{copy.guides}</h2>
          </div>
          <div className="docs-resources">
            {visibleDocuments.map((item) => (
              <Link key={item.href} href={docsHref(item.href, language)}>
                <FileText size={16} aria-hidden="true" />
                <span>
                  {item.title}
                  <small>{item.description}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
        <aside className="docs-privacy">
          <span className="docs-tag docs-tag--success">
            <LockKeyhole size={13} aria-hidden="true" />
            {copy.privacyTag}
          </span>
          <h3>{copy.privacyTitle}</h3>
          <p>{copy.privacyNote}</p>
          {hasGuide ? <Link href={topics[2].href}>{copy.privacyLink}</Link> : null}
        </aside>
      </div>
      {children ? (
        <details className="docs-about">
          <summary>{copy.about}</summary>
          <div className="docs-prose">{children}</div>
        </details>
      ) : null}
      <footer className="docs-footer">OpenCiVera · {copy.footer}</footer>
    </div>
  );
}

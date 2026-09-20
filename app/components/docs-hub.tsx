"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, Search, X } from "lucide-react";
import type { DocNavGroup } from "../lib/docs/content";
import type { AppDictionary } from "../i18n/types";
import {
  buildDocsSections,
  buildDocsTopics,
  filterDocs,
  FIRST_CV_GUIDE
} from "../lib/docs/presentation";

export default function DocsHub({
  groups,
  copy,
  children
}: {
  groups: DocNavGroup[];
  copy: AppDictionary["docs"];
  children?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const topics = buildDocsTopics(groups, copy);
  const sections = buildDocsSections(groups, copy);
  const documents = groups.flatMap((group) => group.items);
  const results = filterDocs(documents, query);
  const searching = Boolean(query.trim());
  const languageGuide = documents.find(
    (item) => item.href === "/docs/tutorials/add-language-version"
  );

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

  function resourceList(items: typeof documents) {
    return (
      <div className="docs-resources">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <span>
              {item.title}
              <small>{item.description}</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    );
  }

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
      <div role="status" className="docs-search-status">
        {searching ? `${copy.results}: ${results.length}` : ""}
      </div>
      {searching ? (
        resourceList(results)
      ) : (
        <>
          {documents.some((item) => item.href === FIRST_CV_GUIDE) ? (
            <Link className="docs-intro" href={FIRST_CV_GUIDE}>
              {copy.workflow.intro}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : null}
          {topics.length > 0 ? (
            <section aria-labelledby="docs-path-title">
              <div className="docs-section-heading">
                <h2 id="docs-path-title">{copy.workflow.path}</h2>
              </div>
              <ol className="docs-steps">
                {topics.map((topic) => (
                  <li key={topic.href}>
                    <div className="docs-step">
                      <span className="docs-step__number" aria-hidden="true">
                        {topic.step}
                      </span>
                      <div>
                        <h3>
                          <Link href={topic.href}>{topic.title}</Link>
                        </h3>
                        <p>{topic.description}</p>
                        <p className="docs-step__result">
                          {copy.workflow.outcome}: {topic.label}
                        </p>
                        <Link
                          className={`docs-button${topic.step === 1 ? " docs-button--primary" : ""}`}
                          href={topic.href}
                        >
                          {topic.step === 1
                            ? copy.workflow.start
                            : `${copy.workflow.go} ${topic.step}`}
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                    {topic.step === 1 && languageGuide ? (
                      <p className="docs-optional">
                        {copy.workflow.optional}{" "}
                        <Link href={languageGuide.href}>{copy.workflow.language}</Link>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          <div className="docs-support">
            {sections
              .filter((section) => !["start", "workflow"].includes(section.key))
              .map((section) => (
                <section key={section.key}>
                  <div className="docs-section-heading">
                    <h2>{section.title}</h2>
                  </div>
                  {resourceList(section.items)}
                </section>
              ))}
          </div>
        </>
      )}
      {(searching ? results.length === 0 : documents.length === 0) ? (
        <p className="docs-empty">{searching ? copy.no_results : copy.no_docs}</p>
      ) : null}
      {!searching && children ? (
        <details className="docs-about">
          <summary>{copy.about}</summary>
          <div className="docs-prose">{children}</div>
        </details>
      ) : null}
      <footer className="docs-footer">OpenCiVera · {copy.footer}</footer>
    </div>
  );
}

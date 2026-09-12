import { createRoot } from "react-dom/client";
import "../../app/globals.css";
import DocsLayout from "../../app/components/docs-layout";
import DocsHub from "../../app/components/docs-hub";
import AppBrand from "../../app/components/app-brand";
import type { DocNavGroup } from "../../app/lib/docs/content";
import type { DocHeading } from "../../app/lib/docs/markdown";
import { resolveDocsLanguage } from "../../app/lib/docs/presentation";
import "../../app/docs/docs.css";

type Fixture = { groups: DocNavGroup[]; html: string; headings: DocHeading[] };
const query = new URLSearchParams(location.search);
const language = resolveDocsLanguage(query.get("lang") || undefined);
const article = location.pathname !== "/docs";
fetch(`/fixture.json?${query}`)
  .then((response) => response.json())
  .then((fixture: Fixture) => {
    createRoot(document.getElementById("root")!).render(
      <>
        <header className="app-header">
          <div className="app-shell app-header__inner">
            <AppBrand />
            <nav>Dashboard · Docs</nav>
          </div>
        </header>
        <main className="app-main">
          <DocsLayout
            groups={fixture.groups}
            activeHref={location.pathname}
            language={language}
            toc={article ? fixture.headings : []}
          >
            {article ? (
              <article className="docs-article">
                <div
                  className="docs-prose"
                  lang="en"
                  dangerouslySetInnerHTML={{ __html: fixture.html }}
                />
              </article>
            ) : (
              <DocsHub groups={fixture.groups} language={language}>
                <p>Documentation overview</p>
              </DocsHub>
            )}
          </DocsLayout>
        </main>
      </>
    );
  });

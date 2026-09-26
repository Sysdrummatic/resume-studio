import { createRoot } from "react-dom/client";
import "../../app/globals.css";
import DocsLayout from "../../app/components/docs-layout";
import DocsHub from "../../app/components/docs-hub";
import AppBrand from "../../app/components/app-brand";
import type { DocNavGroup } from "../../app/lib/docs/content";
import type { DocHeading } from "../../app/lib/docs/markdown";
import type { AppDictionary } from "../../app/i18n/types";
import { AppI18nProvider } from "../../app/components/app-i18n-provider";
import "../../app/docs/docs.css";

type Fixture = {
  groups: DocNavGroup[];
  html: string;
  headings: DocHeading[];
  dictionary: AppDictionary;
  locale: string;
};
const query = new URLSearchParams(location.search);
const article = location.pathname !== "/docs";
if (article) query.set("slug", location.pathname.split("/").at(-1)!);
fetch(`/fixture.json?${query}`)
  .then((response) => response.json())
  .then((fixture: Fixture) => {
    createRoot(document.getElementById("root")!).render(
      <AppI18nProvider
        value={{ locale: fixture.locale, locales: [], dictionary: fixture.dictionary }}
      >
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
            locale={fixture.locale}
            copy={fixture.dictionary.docs}
            toc={article ? fixture.headings : []}
          >
            {article ? (
              <article className="docs-article">
                <div
                  className="docs-prose"
                  lang={fixture.locale}
                  dangerouslySetInnerHTML={{ __html: fixture.html }}
                />
              </article>
            ) : (
              <DocsHub groups={fixture.groups} copy={fixture.dictionary.docs}>
                <p>Documentation overview</p>
              </DocsHub>
            )}
          </DocsLayout>
        </main>
      </AppI18nProvider>
    );
  });

import { notFound } from "next/navigation";
import DocsLayout from "../../../components/docs-layout";
import { requireAuthenticatedActor } from "../../../lib/auth-server";
import { canViewTestScenarios } from "../../../lib/docs/access";
import {
  DOC_CATEGORY_TITLES,
  getDoc,
  isDocCategory,
  listDocNavGroups
} from "../../../lib/docs/content";
import { renderMarkdownWithOutline } from "../../../lib/docs/markdown";
import { docsCopy, resolveDocsLanguage } from "../../../lib/docs/presentation";

export const dynamic = "force-dynamic";

type DocPageProps = {
  searchParams?: Promise<{ lang?: string | string[] }>;
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { category, slug } = await params;
  const actor = await requireAuthenticatedActor();

  if (!isDocCategory(category)) {
    notFound();
  }

  const showTestScenarios = await canViewTestScenarios(actor);

  // Server-side gate: nav visibility is UX only, this notFound() is the boundary.
  if (category === "test-scenarios" && !showTestScenarios) {
    notFound();
  }

  const doc = getDoc(category, slug);
  if (!doc) {
    notFound();
  }

  const { html, headings } = renderMarkdownWithOutline(doc.markdown);
  const language = resolveDocsLanguage((await searchParams)?.lang);

  return (
    <DocsLayout
      groups={listDocNavGroups(showTestScenarios)}
      activeHref={`/docs/${category}/${slug}`}
      toc={headings}
      language={language}
    >
      <article className="docs-article">
        <div className="docs-article__meta">
          <span className="docs-tag">
            {language === "en" ? DOC_CATEGORY_TITLES[category] : docsCopy[language][category]}
          </span>
          {language === "pl" ? <span>{docsCopy.pl.articleLanguage}</span> : null}
        </div>
        <div className="docs-prose" lang="en" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </DocsLayout>
  );
}

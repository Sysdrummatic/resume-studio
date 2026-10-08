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
import { getRequestAppI18n } from "../../../i18n/server";

export const dynamic = "force-dynamic";

type DocPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export default async function DocPage({ params }: DocPageProps) {
  const { category, slug } = await params;
  const actor = await requireAuthenticatedActor();
  const { locale, dictionary } = await getRequestAppI18n();

  if (!isDocCategory(category)) {
    notFound();
  }

  const showTestScenarios = await canViewTestScenarios(actor);

  // Server-side gate: nav visibility is UX only, this notFound() is the boundary.
  if (category === "test-scenarios" && !showTestScenarios) {
    notFound();
  }

  const doc = getDoc(category, slug, locale);
  if (!doc) {
    notFound();
  }

  const { html, headings } = renderMarkdownWithOutline(doc.markdown);
  return (
    <DocsLayout
      groups={listDocNavGroups(showTestScenarios, locale)}
      activeHref={`/docs/${category}/${slug}`}
      toc={headings}
      locale={locale}
      copy={dictionary.docs}
    >
      <article className="docs-article">
        <div className="docs-article__meta">
          <span className="docs-tag">
            {locale === "en" ? DOC_CATEGORY_TITLES[category] : category === "test-scenarios" ? dictionary.docs.test_scenarios : dictionary.docs.tutorials}
          </span>
          {doc.locale !== locale ? <span>{dictionary.docs.article_fallback}</span> : null}
        </div>
        <div className="docs-prose" lang={doc.locale} dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </DocsLayout>
  );
}

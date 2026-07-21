import { notFound } from "next/navigation";
import DocsLayout from "../../../components/docs-layout";
import { requireAuthenticatedActor } from "../../../lib/auth-server";
import { canViewTestScenarios } from "../../../lib/docs/access";
import { DOC_CATEGORY_TITLES, getDoc, isDocCategory, listDocNavGroups } from "../../../lib/docs/content";
import { renderMarkdownWithOutline } from "../../../lib/docs/markdown";

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

  return (
    <DocsLayout groups={listDocNavGroups(showTestScenarios)} activeHref={`/docs/${category}/${slug}`} toc={headings}>
      <article className="card stack">
        <span className="product-surface__eyebrow">{DOC_CATEGORY_TITLES[category]}</span>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </DocsLayout>
  );
}

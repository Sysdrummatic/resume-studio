import Link from "next/link";
import { notFound } from "next/navigation";
import { Typography } from "../../../components/design-system/atoms/Typography";
import { requireAuthenticatedActor } from "../../../lib/auth-server";
import { canViewTestScenarios } from "../../../lib/docs/access";
import { getDoc, isDocCategory, listDocs, type DocCategory } from "../../../lib/docs/content";
import { renderMarkdownToHtml } from "../../../lib/docs/markdown";

export const dynamic = "force-dynamic";

const CATEGORY_TITLES: Record<DocCategory, string> = {
  tutorials: "Tutorials",
  "test-scenarios": "Test Scenarios",
};

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

  // Server-side gate: nav visibility is UX only, this notFound() is the boundary.
  if (category === "test-scenarios" && !(await canViewTestScenarios(actor))) {
    notFound();
  }

  const doc = getDoc(category, slug);
  if (!doc) {
    notFound();
  }

  const siblings = listDocs(category);

  return (
    <div className="docs-layout">
      <aside className="card stack docs-layout__sidebar">
        <Typography variant="caption" muted>
          {CATEGORY_TITLES[category]}
        </Typography>
        <nav className="stack" aria-label="Documents in this category">
          {siblings.map((entry) => (
            <Link
              key={entry.slug}
              href={`/docs/${category}/${entry.slug}`}
              className="auth-card__link"
              aria-current={entry.slug === slug ? "page" : undefined}
            >
              {entry.title}
            </Link>
          ))}
        </nav>
        <Link href="/docs" className="auth-card__link">
          All docs
        </Link>
      </aside>
      <article className="card stack" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(doc.markdown) }} />
    </div>
  );
}

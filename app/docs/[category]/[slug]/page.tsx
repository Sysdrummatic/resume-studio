import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocsLayout from "../../../components/docs-layout";
import { getCurrentActor, requireAuthenticatedActor } from "../../../lib/auth-server";
import { canViewTestScenarios } from "../../../lib/docs/access";
import {
  DOC_CATEGORY_TITLES,
  getDoc,
  isDocCategory,
  listDocNavGroups
} from "../../../lib/docs/content";
import { renderMarkdownWithOutline } from "../../../lib/docs/markdown";
import { getAppBaseUrl } from "../../../lib/env";
import { safeJsonLdScript } from "../../../lib/jsonld";
import { buildBreadcrumbListJsonLd, buildTechArticleJsonLd } from "../../../lib/jsonld-schemas";
import { getRequestAppI18n } from "../../../i18n/server";
import { getLanguageAlternatesMetadata } from "../../../lib/language-alternates";

export const dynamic = "force-dynamic";

type DocPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { category, slug } = await params;
  if (!isDocCategory(category)) {
    return {};
  }
  const { locale } = await getRequestAppI18n();
  const doc = getDoc(category, slug, locale);
  if (!doc) {
    return {};
  }
  if (doc.isPublic) {
    return {
      title: `${doc.title} | OpenCiVera`,
      description: doc.description || undefined,
      robots: { index: true, follow: true },
      alternates: await getLanguageAlternatesMetadata(`/docs/${category}/${slug}`),
    };
  }

  // Same boundary as the page body: hidden documents never leak title/description to anonymous or unauthorized requests.
  const noindex = { index: false, follow: false };
  const actor = await getCurrentActor();
  const canRead = actor && (category !== "test-scenarios" || (await canViewTestScenarios(actor)));
  if (!canRead) {
    return { robots: noindex };
  }
  return {
    title: `${doc.title} | OpenCiVera`,
    description: doc.description || undefined,
    robots: noindex,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { category, slug } = await params;
  let actor = await getCurrentActor();
  const { locale, dictionary } = await getRequestAppI18n();

  if (!isDocCategory(category)) {
    notFound();
  }

  const showTestScenarios = actor ? await canViewTestScenarios(actor) : false;

  // Server-side gate: nav visibility is UX only, this notFound() is the boundary.
  if (category === "test-scenarios" && !showTestScenarios) {
    notFound();
  }

  const doc = getDoc(category, slug, locale);
  if (!doc) {
    notFound();
  }

  // Public docs (ADR 0025) render for anonymous visitors; everything else keeps the login gate.
  if (!doc.isPublic && !actor) {
    actor = await requireAuthenticatedActor();
  }

  const { html, headings } = renderMarkdownWithOutline(doc.markdown);
  const baseUrl = getAppBaseUrl().replace(/\/+$/, "");
  const docPath = `/docs/${category}/${slug}`;
  const categoryTitle =
    locale === "en" ? DOC_CATEGORY_TITLES[category] : category === "test-scenarios" ? dictionary.docs.test_scenarios : dictionary.docs.tutorials;
  const docSchemas = [
    buildTechArticleJsonLd({
      baseUrl,
      path: docPath,
      title: doc.title,
      description: doc.description,
      inLanguage: doc.locale,
    }),
    buildBreadcrumbListJsonLd([
      { name: "OpenCiVera", url: baseUrl },
      { name: "Docs", url: `${baseUrl}/docs` },
      { name: categoryTitle, url: `${baseUrl}/docs#${category}` },
      { name: doc.title, url: `${baseUrl}${docPath}` },
    ]),
  ];

  return (
    <DocsLayout
      groups={listDocNavGroups(showTestScenarios, locale, { publicOnly: !actor })}
      activeHref={`/docs/${category}/${slug}`}
      toc={headings}
      locale={locale}
      copy={dictionary.docs}
    >
      {docSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdScript(schema) }}
        />
      ))}
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

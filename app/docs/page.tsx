import DocsLayout from "../components/docs-layout";
import DocsHub from "../components/docs-hub";
import { getCurrentActor } from "../lib/auth-server";
import { canViewTestScenarios } from "../lib/docs/access";
import { getOverviewDoc, listDocNavGroups } from "../lib/docs/content";
import { renderMarkdownToHtml } from "../lib/docs/markdown";
import { getRequestAppI18n } from "../i18n/server";
import { publicPageMetadata } from "../lib/seo-metadata";
import { getLanguageAlternatesMetadata } from "../lib/language-alternates";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return publicPageMetadata({
    ...dictionary.meta.pages.docs,
    path: "/docs",
    index: true,
    alternates: await getLanguageAlternatesMetadata("/docs"),
  });
}

export const dynamic = "force-dynamic";

export default async function DocsIndexPage() {
  const actor = await getCurrentActor();
  const { locale, dictionary } = await getRequestAppI18n();
  const showTestScenarios = actor ? await canViewTestScenarios(actor) : false;
  const overview = getOverviewDoc(locale);
  const groups = listDocNavGroups(showTestScenarios, locale, { publicOnly: !actor });

  return (
    <DocsLayout groups={groups} activeHref="/docs" locale={locale} copy={dictionary.docs}>
      <DocsHub groups={groups} copy={dictionary.docs}>
        {overview ? (
          <div
            lang={overview.locale}
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(overview.markdown) }}
          />
        ) : null}
      </DocsHub>
    </DocsLayout>
  );
}

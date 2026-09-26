import DocsLayout from "../components/docs-layout";
import DocsHub from "../components/docs-hub";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { canViewTestScenarios } from "../lib/docs/access";
import { getOverviewDoc, listDocNavGroups } from "../lib/docs/content";
import { renderMarkdownToHtml } from "../lib/docs/markdown";
import { getRequestAppI18n } from "../i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return { title: `${dictionary.docs.title} | OpenCiVera`, description: dictionary.docs.lead };
}

export const dynamic = "force-dynamic";

export default async function DocsIndexPage() {
  const actor = await requireAuthenticatedActor();
  const { locale, dictionary } = await getRequestAppI18n();
  const showTestScenarios = await canViewTestScenarios(actor);
  const overview = getOverviewDoc(locale);
  const groups = listDocNavGroups(showTestScenarios, locale);

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

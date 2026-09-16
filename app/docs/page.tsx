import DocsLayout from "../components/docs-layout";
import DocsHub from "../components/docs-hub";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { canViewTestScenarios } from "../lib/docs/access";
import { getOverviewDoc, listDocNavGroups } from "../lib/docs/content";
import { renderMarkdownToHtml } from "../lib/docs/markdown";
import { resolveDocsLanguage } from "../lib/docs/presentation";

export const metadata = {
  title: "Docs | OpenCiVera",
  description: "Tutorials and beta-testing documentation for OpenCiVera."
};

export const dynamic = "force-dynamic";

export default async function DocsIndexPage({
  searchParams
}: {
  searchParams?: Promise<{ lang?: string | string[] }>;
}) {
  const actor = await requireAuthenticatedActor();
  const showTestScenarios = await canViewTestScenarios(actor);
  const overview = getOverviewDoc();
  const language = resolveDocsLanguage((await searchParams)?.lang);
  const groups = listDocNavGroups(showTestScenarios);

  return (
    <DocsLayout groups={groups} activeHref="/docs" language={language}>
      <DocsHub groups={groups} language={language}>
        {overview ? (
          <div
            lang="en"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(overview.markdown) }}
          />
        ) : null}
      </DocsHub>
    </DocsLayout>
  );
}

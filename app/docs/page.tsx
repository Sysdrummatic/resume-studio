import DocsLayout from "../components/docs-layout";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { canViewTestScenarios } from "../lib/docs/access";
import { getOverviewDoc, listDocNavGroups } from "../lib/docs/content";
import { renderMarkdownToHtml } from "../lib/docs/markdown";

export const metadata = {
  title: "Docs | OpenCiVera",
  description: "Tutorials and beta-testing documentation for OpenCiVera.",
};

export const dynamic = "force-dynamic";

export default async function DocsIndexPage() {
  const actor = await requireAuthenticatedActor();
  const showTestScenarios = await canViewTestScenarios(actor);
  const overview = getOverviewDoc();

  return (
    <DocsLayout groups={listDocNavGroups(showTestScenarios)} activeHref="/docs">
      <article className="card stack">
        {overview ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(overview.markdown) }} />
        ) : (
          <p>Select a topic from the sidebar to get started.</p>
        )}
      </article>
    </DocsLayout>
  );
}

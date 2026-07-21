import { Typography } from "../components/design-system/atoms/Typography";
import DocsLayout from "../components/docs-layout";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { canViewTestScenarios } from "../lib/docs/access";
import { listDocNavGroups } from "../lib/docs/content";

export const metadata = {
  title: "Docs | OpenCiVera",
  description: "Tutorials and beta-testing documentation for OpenCiVera.",
};

export const dynamic = "force-dynamic";

export default async function DocsIndexPage() {
  const actor = await requireAuthenticatedActor();
  const showTestScenarios = await canViewTestScenarios(actor);

  return (
    <DocsLayout groups={listDocNavGroups(showTestScenarios)} activeHref="/docs">
      <section className="card stack">
        <Typography variant="h1">Docs</Typography>
        <Typography variant="body" muted>
          Select a topic from the sidebar to get started.
        </Typography>
      </section>
    </DocsLayout>
  );
}

import Link from "next/link";
import { Typography } from "../components/design-system/atoms/Typography";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { canViewTestScenarios } from "../lib/docs/access";
import { listDocs, type DocCategory } from "../lib/docs/content";

export const metadata = {
  title: "Docs | OpenCiVera",
  description: "Tutorials and beta-testing documentation for OpenCiVera.",
};

export const dynamic = "force-dynamic";

type CategoryCard = {
  key: DocCategory;
  title: string;
  lead: string;
};

export default async function DocsIndexPage() {
  const actor = await requireAuthenticatedActor();
  const showTestScenarios = await canViewTestScenarios(actor);

  const categories: CategoryCard[] = [
    {
      key: "tutorials",
      title: "Tutorials",
      lead: "Step-by-step guides for getting the most out of OpenCiVera.",
    },
    ...(showTestScenarios
      ? [
          {
            key: "test-scenarios" as const,
            title: "Test Scenarios",
            lead: "Beta-tester walkthroughs for verifying platform flows and reporting issues.",
          },
        ]
      : []),
  ];

  return (
    <div className="stack docs-index">
      <Typography variant="h1">Docs</Typography>
      {categories.map((category) => (
        <section key={category.key} className="card stack">
          <Typography variant="h2">{category.title}</Typography>
          <Typography variant="body" muted>
            {category.lead}
          </Typography>
          <ul className="stack docs-index__list">
            {listDocs(category.key).map((doc) => (
              <li key={doc.slug}>
                <Link href={`/docs/${category.key}/${doc.slug}`} className="auth-card__link">
                  {doc.title}
                </Link>
                {doc.description ? (
                  <Typography as="span" variant="small" muted>
                    {" "}
                    — {doc.description}
                  </Typography>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

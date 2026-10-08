import type { DocNavGroup } from "./content";
import type { AppDictionary } from "../../i18n/types";

export const FIRST_CV_GUIDE = "/docs/tutorials/publishing-your-first-cv";
export const DOC_TOPIC_GUIDES = [
  "/docs/tutorials/master-resume-basics",
  "/docs/tutorials/create-cv-version",
  "/docs/tutorials/publish-and-share-cv",
  "/docs/tutorials/export-pdf-and-ats"
] as const;

export function docsHref(href: string): string {
  return href;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .trim();
}

export function filterDocs<T extends { title: string; description?: string }>(
  items: T[],
  query: string
): T[] {
  const search = normalizeSearch(query);
  return items.filter((item) =>
    normalizeSearch(`${item.title} ${item.description || ""}`).includes(search)
  );
}

export function buildDocsTopics(groups: DocNavGroup[], copy: AppDictionary["docs"]) {
  const available = new Set(groups.flatMap((group) => group.items.map((item) => item.href)));
  return DOC_TOPIC_GUIDES.flatMap((href, index) => {
    const topic = copy.topics_content[index];
    return available.has(href) && topic ? [{ ...topic, href, step: index + 1 }] : [];
  });
}

export type DocsSection = {
  key: string;
  title: string;
  items: Array<{ href: string; title: string; description?: string; step?: number }>;
};

export function buildDocsSections(
  groups: DocNavGroup[],
  copy: AppDictionary["docs"]
): DocsSection[] {
  const tutorials = groups.find((group) => group.key === "tutorials")?.items || [];
  const workflow = buildDocsTopics(groups, copy);
  const helpSlugs = [
    "troubleshooting-save-publish",
    "save-and-publish-limits",
    "account-and-privacy"
  ];
  const help = helpSlugs.flatMap((slug) =>
    tutorials.filter((item) => item.href === `/docs/tutorials/${slug}`)
  );
  const used = new Set([
    FIRST_CV_GUIDE,
    ...workflow.map((item) => item.href),
    ...help.map((item) => item.href)
  ]);
  return [
    {
      key: "start",
      title: copy.start,
      items: tutorials.filter((item) => item.href === FIRST_CV_GUIDE)
    },
    { key: "workflow", title: copy.workflow.path, items: workflow },
    {
      key: "more",
      title: copy.workflow.more,
      items: tutorials.filter((item) => !used.has(item.href))
    },
    { key: "help", title: copy.workflow.help, items: help },
    {
      key: "test-scenarios",
      title: copy.test_scenarios,
      items: groups.find((group) => group.key === "test-scenarios")?.items || []
    }
  ].filter((section) => section.items.length > 0);
}

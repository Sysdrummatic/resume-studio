import type { DocNavGroup } from "./content";
import type { AppDictionary } from "../../i18n/types";

export const FIRST_CV_GUIDE = "/docs/tutorials/publishing-your-first-cv";

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

const topicAnchors = [
  "1-edit-your-master-resume",
  "2-create-a-cv-version",
  "3-publish-the-cv-version"
];

export function buildDocsTopics(groups: DocNavGroup[], copy: AppDictionary["docs"]) {
  if (!groups.some((group) => group.items.some((item) => item.href === FIRST_CV_GUIDE))) return [];
  return copy.topics_content.map((topic, index) => ({
    ...topic,
    href: docsHref(`${FIRST_CV_GUIDE}#${topicAnchors[index]}`)
  }));
}

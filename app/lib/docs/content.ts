import fs from "node:fs";
import path from "node:path";

export const DOC_CATEGORIES = ["tutorials", "test-scenarios"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOC_CATEGORY_TITLES: Record<DocCategory, string> = {
  tutorials: "Tutorials",
  "test-scenarios": "Test Scenarios",
};

export type DocNavGroup = {
  key: DocCategory;
  title: string;
  items: Array<{ href: string; title: string }>;
};

export type DocEntry = {
  slug: string;
  category: DocCategory;
  title: string;
  description: string;
  order: number;
  updatedAt: string | null;
  markdown: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "docs");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function isDocCategory(value: string): value is DocCategory {
  return (DOC_CATEGORIES as readonly string[]).includes(value);
}

function parseFrontmatter(source: string): { fields: Record<string, string>; body: string } {
  const normalized = source.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { fields: {}, body: normalized };
  }

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { fields, body: normalized.slice(match[0].length) };
}

export function getDoc(category: DocCategory, slug: string): DocEntry | null {
  if (!SLUG_PATTERN.test(slug)) {
    return null;
  }

  const filePath = path.join(CONTENT_ROOT, category, `${slug}.md`);
  let source: string;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const { fields, body } = parseFrontmatter(source);
  const parsedOrder = Number.parseInt(fields.order ?? "", 10);
  return {
    slug,
    category,
    title: fields.title || slug,
    description: fields.description || "",
    order: Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder,
    updatedAt: fields.updatedAt || null,
    markdown: body,
  };
}

export function listDocNavGroups(includeTestScenarios: boolean): DocNavGroup[] {
  const categories: DocCategory[] = includeTestScenarios ? [...DOC_CATEGORIES] : ["tutorials"];
  return categories.map((category) => ({
    key: category,
    title: DOC_CATEGORY_TITLES[category],
    items: listDocs(category).map((doc) => ({
      href: `/docs/${category}/${doc.slug}`,
      title: doc.title,
    })),
  }));
}

export function listDocs(category: DocCategory): DocEntry[] {
  let fileNames: string[];
  try {
    fileNames = fs.readdirSync(path.join(CONTENT_ROOT, category));
  } catch {
    return [];
  }

  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => getDoc(category, fileName.slice(0, -3)))
    .filter((doc): doc is DocEntry => doc !== null)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

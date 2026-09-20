import fs from "node:fs";
import path from "node:path";

export const DOC_CATEGORIES = ["tutorials", "test-scenarios"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];
export const DOC_LOCALES = ["en", "pl"] as const;
export type DocLocale = (typeof DOC_LOCALES)[number];

export const DOC_CATEGORY_TITLES: Record<DocCategory, string> = {
  tutorials: "Tutorials",
  "test-scenarios": "Test Scenarios",
};

export type DocNavGroup = {
  key: DocCategory;
  title: string;
  items: Array<{ href: string; title: string; description?: string }>;
};

export type DocEntry = {
  slug: string;
  category: DocCategory;
  locale: DocLocale;
  title: string;
  description: string;
  order: number;
  updatedAt: string | null;
  markdown: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "docs", "locales");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_RESOURCE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
const DOC_FALLBACK_LOCALE: DocLocale = "en";

function normalizeDocLocale(value: string): DocLocale {
  return (DOC_LOCALES as readonly string[]).includes(value) ? (value as DocLocale) : DOC_FALLBACK_LOCALE;
}

function getLocaleCandidates(localeInput: string): DocLocale[] {
  const locale = normalizeDocLocale(localeInput);
  return locale === DOC_FALLBACK_LOCALE ? [locale] : [locale, DOC_FALLBACK_LOCALE];
}

function getDocSourcePath(
  category: DocCategory,
  slug: string,
  localeInput: string,
): { filePath: string; locale: DocLocale } | null {
  for (const locale of getLocaleCandidates(localeInput)) {
    const categoryRoot = path.join(CONTENT_ROOT, locale, category);
    const directoryFilePath = path.join(categoryRoot, slug, `${slug}.md`);
    const flatFilePath = path.join(categoryRoot, `${slug}.md`);

    if (fs.existsSync(directoryFilePath)) {
      return { filePath: directoryFilePath, locale };
    }
    if (fs.existsSync(flatFilePath)) {
      return { filePath: flatFilePath, locale };
    }
  }
  return null;
}

export function getDocResourcePath(
  category: DocCategory,
  slug: string,
  localeInput: string,
  file: string[],
): { filePath: string; locale: DocLocale } | null {
  if (!SLUG_PATTERN.test(slug) || file.length === 0 || file.some((segment) => !SAFE_RESOURCE_SEGMENT.test(segment))) {
    return null;
  }

  for (const locale of getLocaleCandidates(localeInput)) {
    const filePath = path.join(CONTENT_ROOT, locale, category, slug, "resources", ...file);
    if (fs.existsSync(filePath)) {
      return { filePath, locale };
    }
  }
  return null;
}

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

export function getDoc(category: DocCategory, slug: string, localeInput: string = DOC_FALLBACK_LOCALE): DocEntry | null {
  if (!SLUG_PATTERN.test(slug)) {
    return null;
  }

  const sourcePath = getDocSourcePath(category, slug, localeInput);
  if (!sourcePath) {
    return null;
  }

  let source: string;
  try {
    source = fs.readFileSync(sourcePath.filePath, "utf8");
  } catch {
    return null;
  }

  const { fields, body } = parseFrontmatter(source);
  const parsedOrder = Number.parseInt(fields.order ?? "", 10);
  return {
    slug,
    category,
    locale: sourcePath.locale,
    title: fields.title || slug,
    description: fields.description || "",
    order: Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder,
    updatedAt: fields.updatedAt || null,
    markdown: body,
  };
}

export function getOverviewDoc(localeInput: string = DOC_FALLBACK_LOCALE): { title: string; description: string; markdown: string; locale: DocLocale } | null {
  for (const locale of getLocaleCandidates(localeInput)) {
    const filePath = path.join(CONTENT_ROOT, locale, "docs-overview.md");
    let source: string;
    try {
      source = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const { fields, body } = parseFrontmatter(source);
    return {
      title: fields.title || "Docs",
      description: fields.description || "",
      markdown: body,
      locale,
    };
  }
  return null;
}

export function listDocNavGroups(includeTestScenarios: boolean, localeInput: string = DOC_FALLBACK_LOCALE): DocNavGroup[] {
  const categories: DocCategory[] = includeTestScenarios ? [...DOC_CATEGORIES] : ["tutorials"];
  return categories.map((category) => ({
    key: category,
    title: DOC_CATEGORY_TITLES[category],
    items: listDocs(category, localeInput).map((doc) => ({
      href: `/docs/${category}/${doc.slug}`,
      title: doc.title,
      description: doc.description,
    })),
  }));
}

export function listDocs(category: DocCategory, localeInput: string = DOC_FALLBACK_LOCALE): DocEntry[] {
  const slugs: string[] = [];
  for (const locale of getLocaleCandidates(localeInput)) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(CONTENT_ROOT, locale, category), { withFileTypes: true });
    } catch {
      continue;
    }

    // Prefer the resource-friendly `<slug>/<slug>.md` layout, but keep legacy
    // flat Markdown articles discoverable while a locale is being migrated.
    slugs.push(
      ...entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
      ...entries
        .filter((entry) => entry.isFile() && path.extname(entry.name) === ".md")
        .map((entry) => path.basename(entry.name, ".md")),
    );
  }

  return [...new Set(slugs)]
    .map((slug) => getDoc(category, slug, localeInput))
    .filter((doc): doc is DocEntry => doc !== null)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

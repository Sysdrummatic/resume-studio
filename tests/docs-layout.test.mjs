import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { renderMarkdownWithOutline } = await import("../app/lib/docs/markdown.ts");
const { listDocNavGroups } = await import("../app/lib/docs/content.ts");

const layoutComponentPath = path.join(process.cwd(), "app", "components", "docs-layout.tsx");
const headerNavPath = path.join(process.cwd(), "app", "components", "app-header-navigation.tsx");
const indexRoutePath = path.join(process.cwd(), "app", "docs", "page.tsx");
const docRoutePath = path.join(process.cwd(), "app", "docs", "[category]", "[slug]", "page.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

const fixture = [
  "# Page title",
  "",
  "## First section",
  "",
  "Body text.",
  "",
  "### Nested detail",
  "",
  "## Second section",
  "",
  "#### Too deep for the outline",
].join("\n");

test("heading extraction returns ordered H2/H3 outline with depth, text, and slug", () => {
  const { headings } = renderMarkdownWithOutline(fixture);

  assert.deepEqual(headings, [
    { depth: 2, text: "First section", slug: "first-section" },
    { depth: 3, text: "Nested detail", slug: "nested-detail" },
    { depth: 2, text: "Second section", slug: "second-section" },
  ]);
});

test("rendered heading ids match outline slugs exactly", () => {
  const { html, headings } = renderMarkdownWithOutline(fixture);

  for (const heading of headings) {
    assert.equal(html.includes(`<h${heading.depth} id="${heading.slug}">`), true);
  }
});

test("outline omits H1 and headings deeper than H3", () => {
  const { headings } = renderMarkdownWithOutline(fixture);

  assert.equal(headings.some((heading) => heading.depth !== 2 && heading.depth !== 3), false);
  assert.equal(headings.some((heading) => heading.text.includes("Page title")), false);
  assert.equal(headings.some((heading) => heading.text.includes("Too deep")), false);
});

test("duplicate heading text gets deduplicated slugs that still match the ids", () => {
  const { html, headings } = renderMarkdownWithOutline("## Steps\n\n## Steps\n\n## Steps");

  assert.deepEqual(
    headings.map((heading) => heading.slug),
    ["steps", "steps-1", "steps-2"],
  );
  for (const heading of headings) {
    assert.equal(html.includes(`id="${heading.slug}"`), true);
  }
});

test("sidebar nav groups include Test Scenarios only when allowed", () => {
  const withoutScenarios = listDocNavGroups(false);
  const withScenarios = listDocNavGroups(true);

  assert.deepEqual(
    withoutScenarios.map((group) => group.key),
    ["tutorials"],
  );
  assert.deepEqual(
    withScenarios.map((group) => group.key),
    ["tutorials", "test-scenarios"],
  );
  assert.equal(
    withScenarios
      .find((group) => group.key === "tutorials")
      .items.some((item) => item.href === "/docs/tutorials/publishing-your-first-cv"),
    true,
  );
});

test("DocsLayout imports the shared breakpoint constant instead of redefining it", () => {
  const layoutSource = read(layoutComponentPath);
  const headerSource = read(headerNavPath);

  assert.equal(layoutSource.includes('import { DESKTOP_NAVIGATION_BREAKPOINT_QUERY } from "./app-header-navigation"'), true);
  assert.equal(layoutSource.includes("min-width: 980px"), false);
  assert.equal(headerSource.includes("export const DESKTOP_NAVIGATION_BREAKPOINT_QUERY"), true);
});

test("DocsLayout renders grouped nav with active item marking and conditional right rail", () => {
  const source = read(layoutComponentPath);

  assert.equal(source.includes("groups.map"), true);
  assert.equal(source.includes('aria-current={item.href === activeHref ? "page" : undefined}'), true);
  assert.equal(source.includes("toc.length > 0"), true);
  assert.equal(source.includes("On this page"), true);
});

test("docs index renders the welcome panel inside DocsLayout, not category cards", () => {
  const source = read(indexRoutePath);

  assert.equal(source.includes("DocsLayout"), true);
  assert.equal(source.includes("Select a topic from the sidebar to get started."), true);
  assert.equal(source.includes("listDocNavGroups(showTestScenarios)"), true);
  assert.equal(source.includes("docs-index__list"), false);
});

test("doc detail page renders eyebrow, outline, and the shared layout", () => {
  const source = read(docRoutePath);

  assert.equal(source.includes("DocsLayout"), true);
  assert.equal(source.includes("renderMarkdownWithOutline"), true);
  assert.equal(source.includes("listDocNavGroups(showTestScenarios)"), true);
  assert.equal(source.includes("product-surface__eyebrow"), true);
  assert.equal(source.includes("toc={headings}"), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { canViewTestScenarios, BETA_TEST_SCENARIOS_FLAG_KEY } = await import("../app/lib/docs/access.ts");
const { renderMarkdownToHtml } = await import("../app/lib/docs/markdown.ts");
const { listDocs, getDoc, isDocCategory } = await import("../app/lib/docs/content.ts");

const indexRoutePath = path.join(process.cwd(), "app", "docs", "page.tsx");
const docRoutePath = path.join(process.cwd(), "app", "docs", "[category]", "[slug]", "page.tsx");
const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("canViewTestScenarios truth table: isTestUser AND flag must both hold", async () => {
  const flagOn = async () => true;
  const flagOff = async () => false;

  assert.equal(await canViewTestScenarios({ isTestUser: true }, flagOn), true);
  assert.equal(await canViewTestScenarios({ isTestUser: true }, flagOff), false);
  assert.equal(await canViewTestScenarios({ isTestUser: false }, flagOn), false);
  assert.equal(await canViewTestScenarios({ isTestUser: false }, flagOff), false);
});

test("canViewTestScenarios reads the beta_test_scenarios_visible flag key", async () => {
  let requestedKey = null;
  await canViewTestScenarios({ isTestUser: true }, async (key) => {
    requestedKey = key;
    return true;
  });

  assert.equal(BETA_TEST_SCENARIOS_FLAG_KEY, "beta_test_scenarios_visible");
  assert.equal(requestedKey, "beta_test_scenarios_visible");
});

test("canViewTestScenarios does not consult the flag for non-test users", async () => {
  let flagRead = false;
  await canViewTestScenarios({ isTestUser: false }, async () => {
    flagRead = true;
    return true;
  });

  assert.equal(flagRead, false);
});

test("markdown renders headings, lists, and code", () => {
  const html = renderMarkdownToHtml("# Title\n\n- first item\n- second item\n\n`inline code`");

  assert.equal(html.includes("<h1"), true);
  assert.equal(html.includes("<ul>"), true);
  assert.equal(html.includes("<li>first item</li>"), true);
  assert.equal(html.includes("<code>inline code</code>"), true);
});

test("markdown neutralizes raw HTML including script tags", () => {
  const html = renderMarkdownToHtml(
    'Before\n\n<script>alert("xss")</script>\n\nAfter <img src=x onerror=alert(1)> end',
  );

  assert.equal(html.includes("<script"), false);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("&lt;script"), true);
});

test("content loader lists the sample docs with frontmatter metadata", () => {
  const tutorials = listDocs("tutorials");
  const scenarios = listDocs("test-scenarios");

  assert.equal(tutorials.some((doc) => doc.slug === "publishing-your-first-cv"), true);
  assert.equal(scenarios.some((doc) => doc.slug === "signup-and-login"), true);
  for (const doc of [...tutorials, ...scenarios]) {
    assert.equal(typeof doc.title === "string" && doc.title.length > 0, true);
    assert.equal(typeof doc.order, "number");
  }
});

test("content loader rejects unknown slugs and path traversal", () => {
  assert.equal(getDoc("tutorials", "does-not-exist"), null);
  assert.equal(getDoc("tutorials", "../../package"), null);
  assert.equal(getDoc("tutorials", "..\\..\\package"), null);
  assert.equal(isDocCategory("tutorials"), true);
  assert.equal(isDocCategory("test-scenarios"), true);
  assert.equal(isDocCategory("secrets"), false);
});

test("docs index renders Test Scenarios only for eligible actors", () => {
  const source = read(indexRoutePath);

  assert.equal(source.includes("requireAuthenticatedActor"), true);
  assert.equal(source.includes("canViewTestScenarios"), true);
  assert.equal(source.includes("showTestScenarios"), true);
});

test("doc route 404s unknown categories and gates test-scenarios server-side", () => {
  const source = read(docRoutePath);

  assert.equal(source.includes("requireAuthenticatedActor"), true);
  assert.equal(source.includes("notFound()"), true);
  assert.equal(source.includes("isDocCategory(category)"), true);
  assert.equal(/category === "test-scenarios" && !\(await canViewTestScenarios\(actor\)\)/.test(source), true);
  assert.equal(source.includes("renderMarkdownToHtml"), true);
});

test("authenticated header navigation links to /docs", () => {
  const source = read(layoutPath);

  assert.equal(source.includes('{ href: "/docs", label: "Docs" }'), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { canViewTestScenarios, BETA_TEST_SCENARIOS_FLAG_KEY } = await import("../app/lib/docs/access.ts");
const { renderMarkdownToHtml } = await import("../app/lib/docs/markdown.ts");
const {
  DOC_LOCALES,
  getDoc,
  getDocResourcePath,
  getOverviewDoc,
  isDocCategory,
  listDocs,
} = await import("../app/lib/docs/content.ts");

const accessPath = path.join(process.cwd(), "app", "lib", "docs", "access.ts");
const indexRoutePath = path.join(process.cwd(), "app", "docs", "page.tsx");
const docRoutePath = path.join(process.cwd(), "app", "docs", "[category]", "[slug]", "page.tsx");
const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("canViewTestScenarios truth table: isTestUser AND flag must both hold for non-admins", async () => {
  const flagOn = async () => true;
  const flagOff = async () => false;

  assert.equal(await canViewTestScenarios({ role: "user", isTestUser: true }, flagOn), true);
  assert.equal(await canViewTestScenarios({ role: "user", isTestUser: true }, flagOff), false);
  assert.equal(await canViewTestScenarios({ role: "user", isTestUser: false }, flagOn), false);
  assert.equal(await canViewTestScenarios({ role: "user", isTestUser: false }, flagOff), false);
});

test("canViewTestScenarios grants admin unconditionally without reading the flag", async () => {
  let flagRead = false;
  const flagSpy = async () => {
    flagRead = true;
    return false;
  };

  assert.equal(await canViewTestScenarios({ role: "admin", isTestUser: false }, flagSpy), true);
  assert.equal(flagRead, false);
  assert.equal(await canViewTestScenarios({ role: "admin", isTestUser: true }, flagSpy), true);
  assert.equal(flagRead, false);
});

test("manager keeps the non-admin rule unchanged", async () => {
  const flagOn = async () => true;
  const flagOff = async () => false;

  assert.equal(await canViewTestScenarios({ role: "manager", isTestUser: true }, flagOn), true);
  assert.equal(await canViewTestScenarios({ role: "manager", isTestUser: true }, flagOff), false);
  assert.equal(await canViewTestScenarios({ role: "manager", isTestUser: false }, flagOn), false);
});

test("access helper reuses isAdminRole from rbac, not a raw string comparison", () => {
  const source = read(accessPath);

  assert.equal(source.includes('import { isAdminRole } from "../rbac"'), true);
  assert.equal(source.includes('=== "admin"'), false);
});

test("canViewTestScenarios reads the beta_test_scenarios_visible flag key", async () => {
  let requestedKey = null;
  await canViewTestScenarios({ role: "user", isTestUser: true }, async (key) => {
    requestedKey = key;
    return true;
  });

  assert.equal(BETA_TEST_SCENARIOS_FLAG_KEY, "beta_test_scenarios_visible");
  assert.equal(requestedKey, "beta_test_scenarios_visible");
});

test("canViewTestScenarios does not consult the flag for non-test users", async () => {
  let flagRead = false;
  await canViewTestScenarios({ role: "user", isTestUser: false }, async () => {
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

test("content loader exposes every current tutorial in the docs catalog", () => {
  const tutorialSlugs = new Set(listDocs("tutorials").map((doc) => doc.slug));
  const expectedTutorials = [
    "publishing-your-first-cv",
    "master-resume-basics",
    "create-cv-version",
    "publish-and-share-cv",
    "add-language-version",
    "import-export-cv-data",
    "export-pdf-and-ats",
    "revisions-and-rollback",
    "troubleshooting-save-publish",
    "account-and-privacy",
    "save-and-publish-limits",
  ];

  for (const slug of expectedTutorials) {
    assert.equal(tutorialSlugs.has(slug), true, `Missing tutorial: ${slug}`);
  }
});

test("documentation content is available in Polish and English with matching catalogs", () => {
  assert.deepEqual(DOC_LOCALES, ["en", "pl"]);

  const english = listDocs("tutorials", "en");
  const polish = listDocs("tutorials", "pl");
  assert.deepEqual(
    polish.map((doc) => doc.slug),
    english.map((doc) => doc.slug),
  );
  assert.notEqual(getDoc("tutorials", "publishing-your-first-cv", "en")?.title, getDoc("tutorials", "publishing-your-first-cv", "pl")?.title);
  assert.equal(getDoc("tutorials", "publishing-your-first-cv", "pl")?.locale, "pl");
  assert.equal(getOverviewDoc("en")?.locale, "en");
  assert.equal(getOverviewDoc("pl")?.locale, "pl");
  assert.deepEqual(
    listDocs("test-scenarios", "pl").map((doc) => doc.slug),
    listDocs("test-scenarios", "en").map((doc) => doc.slug),
  );
});

test("localized documentation resources fall back to English assets", () => {
  const resource = getDocResourcePath(
    "tutorials",
    "publishing-your-first-cv",
    "pl",
    ["01-dashboard-nav.png"],
  );

  assert.ok(resource);
  assert.equal(resource.locale, "en");
  assert.equal(resource.filePath.includes(path.join("content", "docs", "locales", "en")), true);
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
  assert.equal(source.includes("canViewTestScenarios(actor)"), true);
  assert.equal(/category === "test-scenarios" && !showTestScenarios/.test(source), true);
  assert.equal(source.includes("renderMarkdownWithOutline"), true);
});

test("authenticated header navigation links to /docs", () => {
  const source = read(layoutPath);

  assert.equal(source.includes('{ href: "/docs", label: appI18n.dictionary.navigation.docs }'), true);
});

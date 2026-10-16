import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildPublicPersonJsonLd,
  buildSoftwareApplicationJsonLd,
  buildTechArticleJsonLd,
  buildWebSiteJsonLd,
} = await import("../app/lib/jsonld-schemas.ts");
const { safeJsonLdScript } = await import("../app/lib/jsonld.ts");
const { normalizeResumeDocument } = await import("../app/lib/resume-schema.ts");

const BASE = "https://opencivera.example/";

test("Organization and WebSite carry required fields and link by @id", () => {
  const org = buildOrganizationJsonLd(BASE, "desc");
  const site = buildWebSiteJsonLd(BASE, "desc", "pl");

  assert.equal(org["@type"], "Organization");
  assert.equal(org.url, "https://opencivera.example");
  assert.equal(org.name, "OpenCiVera");
  assert.equal(site["@type"], "WebSite");
  assert.equal(site.inLanguage, "pl");
  assert.deepEqual(site.publisher, { "@id": org["@id"] });
});

test("SoftwareApplication is a free web application", () => {
  const app = buildSoftwareApplicationJsonLd(BASE, "desc", "en");

  assert.equal(app["@type"], "SoftwareApplication");
  assert.equal(app.offers.price, "0");
  assert.ok(app.applicationCategory);
  assert.ok(app.operatingSystem);
});

test("FAQPage is generated 1:1 from the visible FAQ items", () => {
  const items = [
    { question: "Q1?", answer: "A1" },
    { question: "Q2?", answer: "A2" },
  ];
  const faq = buildFaqPageJsonLd(items);

  assert.equal(faq["@type"], "FAQPage");
  assert.deepEqual(
    faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]),
    [["Q1?", "A1"], ["Q2?", "A2"]],
  );
});

test("the landing FAQ dictionaries feed both the page and the schema", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /buildFaqPageJsonLd\(faq\.items\)/);
  assert.match(page, /faq\.items\.map/);
});

test("TechArticle and BreadcrumbList have required fields and positions", () => {
  const article = buildTechArticleJsonLd({
    baseUrl: BASE,
    path: "/docs/tutorials/x",
    title: "T",
    description: "D",
    inLanguage: "en",
  });
  const crumbs = buildBreadcrumbListJsonLd([
    { name: "A", url: "https://a" },
    { name: "B", url: "https://b" },
  ]);

  assert.equal(article["@type"], "TechArticle");
  assert.equal(article.headline, "T");
  assert.equal(article.url, "https://opencivera.example/docs/tutorials/x");
  assert.deepEqual(
    crumbs.itemListElement.map((e) => [e.position, e.name, e.item]),
    [[1, "A", "https://a"], [2, "B", "https://b"]],
  );
});

function resumeWith(overrides) {
  return normalizeResumeDocument({
    profile: { first_name: "Ann", last_name: "Doe" },
    summary: [{ position: "Engineer", description: "Builds things.", default: true }],
    ...overrides,
  });
}

test("Person gets sameAs only from http(s) contact links", () => {
  const resume = resumeWith({
    contact: [
      { label: "LinkedIn", value: "in/ann", link: "https://linkedin.com/in/ann" },
      { label: "Mail", value: "a@b.c", link: "mailto:a@b.c" },
      { label: "Phone", value: "123", link: "tel:123" },
      { label: "Evil", value: "x", link: "javascript:alert(1)" },
      { label: "Dup", value: "x", link: "https://linkedin.com/in/ann" },
    ],
  });
  const person = buildPublicPersonJsonLd(resume, { name: "Ann Doe", canonicalUrl: "https://x/ann/1" });

  assert.equal(person["@type"], "Person");
  assert.deepEqual(person.sameAs, ["https://linkedin.com/in/ann"]);
  assert.equal(person.jobTitle, "Engineer");
  assert.equal(person.description, "Builds things.");
});

test("Person knowsAbout uses only the given document and omits empty fields", () => {
  const resume = resumeWith({
    skills: [{ name: "TypeScript", level: 4 }],
    tech_stack: ["Postgres", "TypeScript"],
  });
  const person = buildPublicPersonJsonLd(resume, { name: "Ann Doe", canonicalUrl: "https://x/ann/1" });
  assert.deepEqual(person.knowsAbout, ["TypeScript", "Postgres"]);

  const bare = buildPublicPersonJsonLd(resumeWith({ skills: [], tech_stack: [], contact: [] }), {
    name: "Ann Doe",
    canonicalUrl: "https://x/ann/1",
  });
  assert.equal("sameAs" in bare, false);
  assert.equal("knowsAbout" in bare, false);
});

test("Person never leaks phone, e-mail or QR values", () => {
  const resume = resumeWith({
    contact: [
      { label: "Phone", value: "+48 600 700 800", link: "tel:+48600700800" },
      { label: "E-mail", value: "secret@example.com", link: "mailto:secret@example.com" },
    ],
  });
  const json = safeJsonLdScript(buildPublicPersonJsonLd(resume, { name: "Ann", canonicalUrl: "https://x/a/1" }));

  assert.equal(json.includes("secret@example.com"), false);
  assert.equal(json.includes("600 700 800"), false);
});

test("malicious strings from the CV cannot break out of the script element", () => {
  const evil = "</script><script>alert(1)</script>";
  const resume = resumeWith({
    summary: [{ position: evil, description: evil, default: true }],
    skills: [{ name: evil, level: 3 }],
    contact: [{ label: "x", value: "x", link: `https://e.com/?q=${evil}` }],
  });
  const html = safeJsonLdScript(buildPublicPersonJsonLd(resume, { name: evil, canonicalUrl: "https://x/a/1" }));
  const faq = safeJsonLdScript(buildFaqPageJsonLd([{ question: evil, answer: evil }]));

  for (const out of [html, faq]) {
    assert.equal(out.includes("</script>"), false);
    assert.equal(out.includes("<"), false);
    JSON.parse(out);
  }
});

test("every JSON-LD script goes through safeJsonLdScript", () => {
  for (const file of ["../app/layout.tsx", "../app/page.tsx", "../app/docs/[category]/[slug]/page.tsx"]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(src, /safeJsonLdScript\(/, file);
    assert.equal(/JSON\.stringify/.test(src), false, file);
  }
});

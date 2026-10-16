import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { renderMarkdownWithOutline } = await import("../app/lib/docs/markdown.ts");
const { DOC_CATEGORIES, DOC_LOCALES, listDocs } = await import("../app/lib/docs/content.ts");
const { readAppDictionary: getAppDictionary } = await import("./helpers/app-i18n.mjs");
const { LegalDocumentView } = await import("../app/components/legal-document.tsx");

const root = process.cwd();

function headingLevels(html) {
  return [...html.matchAll(/<h([1-6])[\s>]/g)].map((match) => Number(match[1]));
}

function assertSingleH1AndNoSkips(levels, label) {
  assert.equal(levels.filter((level) => level === 1).length, 1, `${label}: exactly one h1`);
  assert.equal(levels[0], 1, `${label}: first heading is the h1`);
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(levels[index] - levels[index - 1] <= 1, `${label}: h${levels[index - 1]} -> h${levels[index]} skips a level`);
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

test("privacy and terms render one h1 and a gap-free hierarchy in every locale", () => {
  for (const locale of ["en", "pl"]) {
    const dictionary = getAppDictionary(locale);
    for (const key of ["privacy", "terms"]) {
      const html = renderToStaticMarkup(createElement(LegalDocumentView, { document: dictionary.legal[key] }));
      assertSingleH1AndNoSkips(headingLevels(html), `${key}/${locale}`);
    }
  }
});

test("the CV renderer makes the name the h1 only on the standalone public CV", () => {
  const source = fs.readFileSync(path.join(root, "app/components/resume-renderer/ResumeRenderer.tsx"), "utf8");
  assert.doesNotMatch(source, /<h1[\s>]/, "name heading is chosen by NameHeading, never a literal h1");
  assert.match(source, /const NameHeading = mode === "public" && !isEmbedded \? "h1" : "h2";/);
  assert.match(source, /<NameHeading>/);
  assert.equal((source.match(/<NameHeading>/g) ?? []).length, 1);
  assert.match(source, /<h2>\{rendererLabels\.summary\}<\/h2>/);
});

test("docs: the markdown title is the single h1 and the rest never skips a level", () => {
  let checked = 0;
  for (const category of DOC_CATEGORIES) {
    for (const locale of DOC_LOCALES) {
      for (const doc of listDocs(category, locale)) {
        const { html } = renderMarkdownWithOutline(doc.markdown);
        assertSingleH1AndNoSkips(headingLevels(html), `${category}/${doc.slug}/${locale}`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0);
});

test("landing and docs hub each declare exactly one h1 in source", () => {
  for (const file of ["app/page.tsx", "app/components/docs-hub.tsx", "app/cv-templates/page.tsx"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.equal((source.match(/<h1[\s>]/g) ?? []).length, 1, file);
  }
});

test("no <img> or next/image element in app/ is missing an alt attribute", () => {
  for (const file of walk(path.join(root, "app"))) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/<(img|Image)\b[^>]*?(\/>|>)/gs)) {
      assert.match(match[0], /\balt=/, `${path.relative(root, file)}: ${match[0].slice(0, 60)}`);
    }
  }
});

test("UserAvatar takes its alt from the caller instead of a constant", () => {
  const source = fs.readFileSync(path.join(root, "app/components/design-system/atoms/UserAvatar.tsx"), "utf8");
  assert.doesNotMatch(source, /alt="User avatar"/);
  assert.match(source, /alt=\{alt\}/);
});

test("not-found, error and global-error exist with navigation and no leaked internals", () => {
  const notFound = fs.readFileSync(path.join(root, "app/not-found.tsx"), "utf8");
  const routeError = fs.readFileSync(path.join(root, "app/error.tsx"), "utf8");
  const globalError = fs.readFileSync(path.join(root, "app/global-error.tsx"), "utf8");

  assert.match(notFound, /index:\s*false/);
  assert.match(notFound, /href="\/"/);
  assert.match(routeError, /^"use client"/);
  assert.match(routeError, /onClick=\{reset\}/);
  assert.match(globalError, /^"use client"/);
  assert.match(globalError, /<html/);
  assert.match(globalError, /name="robots" content="noindex/);
  for (const source of [routeError, globalError]) {
    assert.doesNotMatch(source, /error\.(message|stack|digest)/);
  }
});

test("error page copy exists in English and Polish", () => {
  for (const locale of ["en", "pl"]) {
    const { errors } = getAppDictionary(locale);
    for (const value of [errors.not_found.title, errors.server.title, errors.server.retry, errors.home]) {
      assert.ok(typeof value === "string" && value.length > 0, locale);
    }
  }
  assert.notEqual(getAppDictionary("en").errors.not_found.title, getAppDictionary("pl").errors.not_found.title);
});

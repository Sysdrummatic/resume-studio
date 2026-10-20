import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createRequire, register } from "node:module";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { canViewTestScenarios } = await import("../app/lib/docs/access.ts");
const require = createRequire(import.meta.url);
const dictionary = readAppDictionary("en");
const appI18n = {
  locale: "en",
  locales: [{ code: "en", name: "English", nativeName: "English" }],
  dictionary
};

function loadPages(actor, flag = false) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true
      }
    });
    function localRequire(specifier) {
      if (specifier.endsWith("/lib/auth-server"))
        return {
          getCurrentActor: async () => actor,
          requireAuthenticatedActor: async () => {
            if (!actor) throw new Error("LOGIN_REDIRECT");
            return actor;
          }
        };
      if (specifier.endsWith("/lib/docs/access"))
        return { canViewTestScenarios: (value) => canViewTestScenarios(value, async () => flag) };
      if (specifier.endsWith("/i18n/server")) return { getRequestAppI18n: async () => appI18n };
      if (specifier.endsWith("/app-i18n-provider")) return { useAppI18n: () => appI18n, useOptionalAppI18n: () => appI18n };
      if (specifier === "next/navigation")
        return {
          notFound: () => {
            throw new Error("NOT_FOUND");
          }
        };
      if (specifier.endsWith("/app-header-navigation"))
        return { DESKTOP_NAVIGATION_BREAKPOINT_QUERY: "(min-width: 980px)" };
      if (!specifier.startsWith(".")) return require(specifier);
      const target = path.resolve(path.dirname(file), specifier);
      const resolved = [target, `${target}.ts`, `${target}.tsx`].find((candidate) =>
        existsSync(candidate)
      );
      if (!resolved) throw new Error(`Missing test dependency: ${specifier}`);
      return load(resolved);
    }
    new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
    return module.exports;
  }
  return {
    index: load(path.resolve("app/docs/page.tsx")).default,
    article: load(path.resolve("app/docs/[category]/[slug]/page.tsx")).default,
    resource: load(path.resolve("app/docs/[category]/[slug]/resources/[...file]/route.ts")).GET
  };
}

const params = (category, slug) => ({ params: Promise.resolve({ category, slug }) });

test("anonymous visitors read public docs, never test scenarios (ADR 0025)", async () => {
  const pages = loadPages(null);
  const index = renderToStaticMarkup(await pages.index({}));
  assert.match(index, /\/docs\/tutorials\/publishing-your-first-cv/);
  assert.doesNotMatch(index, /test-scenarios/);
  const article = renderToStaticMarkup(
    await pages.article(params("tutorials", "publishing-your-first-cv"))
  );
  assert.match(article, /Publishing your first LiveCV/);
  await assert.rejects(pages.article(params("test-scenarios", "signup-and-login")), /NOT_FOUND/);
});

test("a non-public doc still sends anonymous visitors to login", async () => {
  const dir = path.resolve("content/docs/locales/en/tutorials/private-fixture");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "private-fixture.md"),
    "---\ntitle: Private\npublic: false\norder: 99\n---\n\n# Private\n"
  );
  try {
    const anonymous = loadPages(null);
    await assert.rejects(anonymous.article(params("tutorials", "private-fixture")), /LOGIN_REDIRECT/);
    const index = renderToStaticMarkup(await anonymous.index({}));
    assert.doesNotMatch(index, /private-fixture/);
    const signedIn = loadPages({ role: "user", isTestUser: false });
    assert.match(
      renderToStaticMarkup(await signedIn.article(params("tutorials", "private-fixture"))),
      /Private/
    );
    const input = {
      params: Promise.resolve({ category: "tutorials", slug: "private-fixture", file: ["a.webp"] })
    };
    await assert.rejects(
      anonymous.resource(new Request("http://localhost/x.png"), input),
      /LOGIN_REDIRECT/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("server-rendered docs and direct scenario URLs preserve all role/flag combinations", async () => {
  for (const role of ["admin", "manager", "user", "recruiter"]) {
    for (const isTestUser of [false, true])
      for (const flag of [false, true]) {
        const pages = loadPages({ role, isTestUser }, flag);
        const allowed = role === "admin" || (isTestUser && flag);
        const html = renderToStaticMarkup(await pages.index({}));
        assert.match(html, /Create your LiveCV step by step/);
        assert.equal(
          [...html.matchAll(/<h1\b/g)].length,
          1,
          "The hub owns the page title, including when the overview is expanded"
        );
        assert.equal(html.includes("/docs/test-scenarios/signup-and-login"), allowed);
        const request = pages.article(params("test-scenarios", "signup-and-login"));
        if (allowed)
          assert.match(renderToStaticMarkup(await request), /Test scenario: Sign-up and sign-in/);
        else await assert.rejects(request, /NOT_FOUND/);
      }
  }
});

test("article Markdown, outline and breadcrumbs keep real targets; unknown docs remain 404", async () => {
  const pages = loadPages({ role: "user", isTestUser: false });
  const html = renderToStaticMarkup(
    await pages.article({
      ...params("tutorials", "publishing-your-first-cv"),
      searchParams: Promise.resolve({ lang: "pl" })
    })
  );
  assert.match(html, /href="\/docs"/);
  assert.match(html, /aria-current="page">Publishing your first LiveCV/);
  assert.match(html, /id="four-steps"/);
  assert.match(html, /href="#four-steps"/);
  assert.match(html, /lang="en"/);
  assert.match(html, /href="\/docs\/tutorials\/master-resume-basics"/);
  assert.doesNotMatch(html, /href="\/docs\/tutorials"/);
  await assert.rejects(pages.article(params("unknown", "publishing-your-first-cv")), /NOT_FOUND/);
  await assert.rejects(pages.article(params("tutorials", "missing")), /NOT_FOUND/);
});

test("public image resources are anonymous and publicly cacheable; traversal stays blocked", async () => {
  const input = {
    params: Promise.resolve({
      category: "tutorials",
      slug: "publishing-your-first-cv",
      file: ["01-dashboard-nav.webp"]
    })
  };
  const req = new Request(
    "http://localhost/docs/tutorials/publishing-your-first-cv/resources/01-dashboard-nav.webp"
  );
  const anonymousResponse = await loadPages(null).resource(req, input);
  assert.equal(anonymousResponse.status, 200);
  assert.match(anonymousResponse.headers.get("Cache-Control"), /^public/);
  const pages = loadPages({ role: "user", isTestUser: false });
  const response = await pages.resource(req, input);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/webp");
  assert.ok((await response.arrayBuffer()).byteLength > 100);
  const traversal = await pages.resource(req, {
    params: Promise.resolve({
      category: "tutorials",
      slug: "publishing-your-first-cv",
      file: ["..", "private.png"]
    })
  });
  assert.equal(traversal.status, 404);
});

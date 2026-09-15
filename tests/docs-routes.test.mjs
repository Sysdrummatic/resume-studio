import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire, register } from "node:module";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { canViewTestScenarios } = await import("../app/lib/docs/access.ts");
const require = createRequire(import.meta.url);

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
          requireAuthenticatedActor: async () => {
            if (!actor) throw new Error("LOGIN_REDIRECT");
            return actor;
          }
        };
      if (specifier.endsWith("/lib/docs/access"))
        return { canViewTestScenarios: (value) => canViewTestScenarios(value, async () => flag) };
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

test("docs index and articles preserve login protection (isolated auth)", async () => {
  const pages = loadPages(null);
  await assert.rejects(pages.index({}), /LOGIN_REDIRECT/);
  await assert.rejects(
    pages.article(params("tutorials", "publishing-your-first-cv")),
    /LOGIN_REDIRECT/
  );
});

test("server-rendered docs and direct scenario URLs preserve all role/flag combinations", async () => {
  for (const role of ["admin", "manager", "user", "recruiter"]) {
    for (const isTestUser of [false, true])
      for (const flag of [false, true]) {
        const pages = loadPages({ role, isTestUser }, flag);
        const allowed = role === "admin" || (isTestUser && flag);
        const html = renderToStaticMarkup(await pages.index({}));
        assert.match(html, /How can we help/);
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
  assert.match(html, /href="\/docs\?lang=pl"/);
  assert.match(html, /aria-current="page">Publishing your first CV/);
  assert.match(html, /id="1-edit-your-master-resume"/);
  assert.match(html, /href="#1-edit-your-master-resume"/);
  assert.match(html, /lang="en"/);
  assert.match(html, /resources\/01-dashboard-nav.png/);
  assert.doesNotMatch(html, /href="\/docs\/tutorials"/);
  await assert.rejects(pages.article(params("unknown", "publishing-your-first-cv")), /NOT_FOUND/);
  await assert.rejects(pages.article(params("tutorials", "missing")), /NOT_FOUND/);
});

test("image resources retain authentication, PNG content, private caching and traversal checks", async () => {
  const input = {
    params: Promise.resolve({
      category: "tutorials",
      slug: "publishing-your-first-cv",
      file: ["01-dashboard-nav.png"]
    })
  };
  const req = new Request(
    "http://localhost/docs/tutorials/publishing-your-first-cv/resources/01-dashboard-nav.png"
  );
  await assert.rejects(loadPages(null).resource(req, input), /LOGIN_REDIRECT/);
  const pages = loadPages({ role: "user", isTestUser: false });
  const response = await pages.resource(req, input);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.match(response.headers.get("Cache-Control"), /^private/);
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

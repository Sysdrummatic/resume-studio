import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const robotsSource = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
const sitemapSource = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../app/lib/resume-server.ts", import.meta.url), "utf8");

const PRIVATE = ["/api/", "/dashboard", "/admin", "/master-resume", "/user", "/onboarding", "/settings"];
const PUBLIC = ["/login", "/docs", "/resume", "/privacy", "/terms"];

test("robots disallows every private area", () => {
  for (const path of PRIVATE) {
    assert.ok(robotsSource.includes(`"${path}"`), `robots must disallow ${path}`);
  }
  assert.match(robotsSource, /disallow:\s*PRIVATE_PATHS/);
});

test("robots does not block public pages and keeps the sitemap link", () => {
  for (const path of PUBLIC) {
    assert.ok(!robotsSource.includes(`"${path}"`), `robots must not block ${path}`);
  }
  assert.ok(!/disallow:\s*"\/"/.test(robotsSource));
  assert.match(robotsSource, /sitemap:.*\/sitemap\.xml/);
});

test("sitemap lists the public static pages with lastModified", () => {
  assert.match(sitemapSource, /\{ url: base, lastModified/);
  for (const path of ["/resume", "/privacy", "/terms"]) {
    assert.match(sitemapSource, new RegExp("url: [`\"]\\$\\{base\\}" + path + "[`\"],? lastModified"), `missing ${path}`);
  }
});

test("sitemap contains no protected or noindex routes", () => {
  for (const path of ["/login", "/dashboard", "/admin", "/master-resume", "/user", "/onboarding", "/settings", "/api"]) {
    assert.ok(!sitemapSource.includes("}" + path), `sitemap must not list ${path}`);
  }
});

test("sitemap does not swallow database failures", () => {
  assert.ok(!/catch\s*\{[^}]*return entries/.test(sitemapSource));
  assert.match(sitemapSource, /export const dynamic = "force-dynamic"/);
  const fn = serverSource.slice(serverSource.indexOf("fetchIndexablePublicLinksForSitemap"));
  const body = fn.slice(0, fn.indexOf("\nexport async function", 10));
  assert.match(body, /throw new Error/);
  assert.ok(!/error\)\s*\{\s*return \[\]/.test(body));
});

test("sitemap link query is paginated and bounded", () => {
  assert.match(serverSource, /SITEMAP_MAX_LINKS\s*=\s*49_000/);
  assert.match(serverSource, /limit=\$\{pageSize\}&offset=\$\{offset\}/);
});

test("sitemap fails loudly instead of truncating past the link cap", () => {
  assert.match(serverSource, /SITEMAP_MAX_LINKS \+ 1 - offset/);
  assert.match(serverSource, /rows\.length > SITEMAP_MAX_LINKS\)\s*\{\s*throw new Error/);
});

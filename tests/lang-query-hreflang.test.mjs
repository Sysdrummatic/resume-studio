import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildLanguageAlternates,
  resolveAppLocale,
  withLangParam,
} from "../app/i18n/locale.ts";

const base = {
  enabledLocales: ["pl", "en"],
  countryLocales: { PL: "pl" },
  knownCountryFallback: "en",
  defaultLocale: "pl",
};

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("?lang= wins over cookie, country and Accept-Language", () => {
  assert.equal(
    resolveAppLocale({ ...base, queryLocale: "en", cookieLocale: "pl", countryCode: "PL", acceptLanguage: "pl" }),
    "en",
  );
});

test("an unsupported ?lang= falls through to cookie, then Accept-Language", () => {
  assert.equal(resolveAppLocale({ ...base, queryLocale: "xx", cookieLocale: "en" }), "en");
  assert.equal(resolveAppLocale({ ...base, queryLocale: "de", acceptLanguage: "en-US,en;q=0.9" }), "en");
  assert.equal(resolveAppLocale({ ...base, queryLocale: null, cookieLocale: "pl", acceptLanguage: "en" }), "pl");
});

test("withLangParam adds the language to public paths only", () => {
  assert.equal(withLangParam("/", "en"), "/?lang=en");
  assert.equal(withLangParam("/resume", "pl"), "/resume?lang=pl");
  assert.equal(withLangParam("/docs/tutorials/a#steps", "en"), "/docs/tutorials/a?lang=en#steps");
  assert.equal(withLangParam("/docs?lang=pl", "en"), "/docs?lang=en");
  assert.equal(withLangParam("/login?mode=signup", "en"), "/login?mode=signup");
  assert.equal(withLangParam("/dashboard", "en"), "/dashboard");
  assert.equal(withLangParam("https://example.com/", "en"), "https://example.com/");
  assert.equal(withLangParam("/privacy", null), "/privacy");
});

test("buildLanguageAlternates gives a self-referencing canonical, hreflang and x-default", () => {
  const alternates = buildLanguageAlternates({
    baseUrl: "https://opencivera.example/",
    pathname: "/privacy",
    locale: "en",
    locales: ["pl", "en"],
  });
  assert.equal(alternates.canonical, "https://opencivera.example/privacy?lang=en");
  assert.deepEqual(alternates.languages, {
    pl: "https://opencivera.example/privacy?lang=pl",
    en: "https://opencivera.example/privacy?lang=en",
    "x-default": "https://opencivera.example/privacy",
  });

  const home = buildLanguageAlternates({
    baseUrl: "https://opencivera.example",
    pathname: "/",
    locale: "pl",
    locales: ["pl", "en"],
  });
  assert.equal(home.canonical, "https://opencivera.example/?lang=pl");
  assert.equal(home.languages["x-default"], "https://opencivera.example/");
});

test("proxy forwards a validated ?lang= and never trusts a client-sent header", () => {
  const proxy = read("proxy.ts");
  assert.match(proxy, /APP_LANG_QUERY_HEADER_NAME/);
  assert.match(proxy, /request\.headers\.delete\(APP_LANG_QUERY_HEADER_NAME\)/);
  assert.match(read("app/i18n/server.ts"), /queryLocale: requestHeaders\.get\(APP_LANG_QUERY_HEADER_NAME\)/);
});

test("public pages publish language alternates", () => {
  const pages = {
    "app/page.tsx": '"/"',
    "app/resume/page.tsx": '"/resume"',
    "app/privacy/page.tsx": '"/privacy"',
    "app/terms/page.tsx": '"/terms"',
    "app/docs/page.tsx": '"/docs"',
  };
  for (const [file, pathname] of Object.entries(pages)) {
    assert.ok(read(file).includes(`getLanguageAlternatesMetadata(${pathname})`), file);
  }
  assert.match(read("app/docs/[category]/[slug]/page.tsx"), /getLanguageAlternatesMetadata\(`\/docs\//);
});

test("sitemap lists every language variant of the static public pages", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /buildLanguageAlternates/);
  assert.match(sitemap, /"\/", "\/resume", "\/privacy", "\/terms"/);
});

test("internal navigation links and the language switcher carry ?lang=", () => {
  for (const file of [
    "app/components/footer.tsx",
    "app/components/app-header-navigation.tsx",
    "app/components/docs-layout.tsx",
    "app/page.tsx",
  ]) {
    assert.match(read(file), /localized-link/, file);
  }
  const menu = read("app/components/app-language-menu.tsx");
  assert.match(menu, /searchParams\.set\(APP_LANG_QUERY_PARAM, nextLocale\)/);
});

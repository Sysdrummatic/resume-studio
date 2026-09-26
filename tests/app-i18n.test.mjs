import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import yaml from "js-yaml";
import { formatAppMessage, resolveAcceptLanguage, resolveAppLocale, selectEnabledLocale } from "../app/i18n/locale.ts";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readYaml(relativePath) {
  return yaml.load(read(relativePath));
}

function shapePaths(value, prefix = "") {
  if (Array.isArray(value)) {
    const paths = [`${prefix}[]`];
    return value.length > 0 ? paths.concat(shapePaths(value[0], `${prefix}[]`)) : paths;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).flatMap((key) => shapePaths(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

test("application locale config enables Polish first with English fallback", () => {
  const config = readYaml("app/i18n/config.yaml");
  const enabled = config.locales.filter((locale) => locale.enabled).map((locale) => locale.code);

  assert.equal(config.default_locale, "pl");
  assert.equal(config.fallback_locale, "en");
  assert.deepEqual(enabled, ["pl", "en"]);
  assert.equal(config.geo.country_locales.PL, "pl");
  assert.equal(config.geo.known_country_fallback, "en");

  for (const locale of config.locales) {
    assert.equal(fs.existsSync(path.join(root, "app/i18n", locale.dictionary)), true);
  }
});

test("every enabled application dictionary matches the fallback dictionary shape", () => {
  const config = readYaml("app/i18n/config.yaml");
  const fallback = config.locales.find((locale) => locale.code === config.fallback_locale);
  const fallbackDictionary = readYaml(path.join("app/i18n", fallback.dictionary));

  for (const locale of config.locales.filter((entry) => entry.enabled)) {
    const dictionary = readYaml(path.join("app/i18n", locale.dictionary));
    assert.deepEqual(shapePaths(dictionary).sort(), shapePaths(fallbackDictionary).sort(), locale.code);
  }
});

test("locale selection accepts supported regional variants and honors quality", () => {
  const enabled = ["pl", "en"];

  assert.equal(selectEnabledLocale("pl-PL", enabled), "pl");
  assert.equal(selectEnabledLocale("de-DE", enabled), null);
  assert.equal(resolveAcceptLanguage("de-DE,de;q=0.9,en;q=0.8,pl;q=0.7", enabled), "en");
  assert.equal(resolveAcceptLanguage("en;q=0.5,pl-PL;q=0.9", enabled), "pl");
  assert.equal(resolveAcceptLanguage("pl;q=0,en;q=0.7", enabled), "en");
});

test("authenticated workspace copy is sourced from the application dictionaries", () => {
  const polish = readYaml("app/i18n/locales/pl.yaml");
  const english = readYaml("app/i18n/locales/en.yaml");
  const accountMenu = read("app/components/account-menu.tsx");
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const admin = read("app/admin/admin-users-client.tsx");
  const docsPresentation = read("app/lib/docs/presentation.ts");
  const user = read("app/user/user-client.tsx");
  const onboarding = read("app/onboarding/onboarding-client.tsx");
  const settings = read("app/settings/onboarding-test-settings.tsx");

  assert.equal(typeof polish.account.profile_modal.first_name, "string");
  assert.equal(typeof english.account.profile_modal.first_name, "string");
  assert.equal(typeof polish.dashboard.main.title, "string");
  assert.equal(typeof english.dashboard.main.title, "string");
  assert.equal(accountMenu.includes("profileLabels.first_name"), true);
  assert.equal(dashboard.includes("dictionary.dashboard"), true);
  assert.equal(dashboard.includes(">Dashboard<"), false);
  assert.equal(dashboard.includes(">Your CVs<"), false);
  assert.equal(typeof polish.editor.text["Master Resume"], "string");
  assert.equal(typeof english.editor.text["Master Resume"], "string");
  assert.equal(editor.includes("dictionary.editor"), true);
  assert.equal(editor.includes("onboardingEditorText"), false);
  assert.equal(typeof polish.admin.text["Admin panel"], "string");
  assert.equal(typeof english.admin.text["Admin panel"], "string");
  assert.equal(admin.includes("dictionary.admin"), true);
  assert.equal(typeof polish.docs.heading, "string");
  assert.equal(typeof english.docs.heading, "string");
  assert.equal(docsPresentation.includes("docsCopy"), false);
  assert.equal(typeof polish.user.text["Personal hub"], "string");
  assert.equal(typeof english.user.text["Personal hub"], "string");
  assert.equal(user.includes("dictionary.user"), true);
  assert.equal(polish.onboarding.steps.length, 14);
  assert.equal(english.onboarding.steps.includes("Welcome to OpenCiVera"), true);
  assert.equal(onboarding.includes("dictionary.onboarding"), true);
  assert.equal(onboarding.includes("const t = (en: string, pl: string)"), false);
  assert.equal(typeof polish.settings.text["Account settings"], "string");
  assert.equal(typeof english.settings.text["Account settings"], "string");
  assert.equal(settings.includes("dictionary.settings"), true);
});

test("application messages support named interpolation without changing unknown placeholders", () => {
  assert.equal(formatAppMessage("Saved {date}", { date: "18.09.2026" }), "Saved 18.09.2026");
  assert.equal(formatAppMessage("{done} of {total}; {unknown}", { done: 3, total: 5 }), "3 of 5; {unknown}");
});

test("application locale resolution follows cookie, header, country, browser and default precedence", () => {
  const base = {
    enabledLocales: ["pl", "en"],
    countryLocales: { PL: "pl" },
    knownCountryFallback: "en",
    defaultLocale: "pl",
  };

  assert.equal(
    resolveAppLocale({ ...base, cookieLocale: "pl", headerLocale: "en", countryCode: "US", acceptLanguage: "en" }),
    "pl",
  );
  assert.equal(resolveAppLocale({ ...base, headerLocale: "en", countryCode: "PL", acceptLanguage: "pl" }), "en");
  assert.equal(resolveAppLocale({ ...base, countryCode: "pl", acceptLanguage: "en" }), "pl");
  assert.equal(resolveAppLocale({ ...base, countryCode: "US", acceptLanguage: "pl" }), "en");
  assert.equal(resolveAppLocale({ ...base, acceptLanguage: "de-DE,de;q=0.9,en;q=0.8" }), "en");
  assert.equal(resolveAppLocale({ ...base, acceptLanguage: "de-DE" }), "pl");
});

test("layout and sample resume use the resolved application locale", () => {
  const layout = read("app/layout.tsx");
  const samplePage = read("app/resume/page.tsx");
  const sampleConfig = readYaml("public/data/public/locales.yaml");

  assert.equal(layout.includes("<html lang={appI18n.locale}"), true);
  assert.equal(samplePage.includes("initialLocale={locale}"), true);
  assert.equal(sampleConfig.default_locale, "pl");
});

test("Netlify edge function forwards country only for HTML requests", async () => {
  const edge = read("netlify/edge-functions/app-locale.js");

  assert.equal(edge.includes("context.geo?.country?.code"), true);
  assert.equal(edge.includes('accept.includes("text/html")'), true);
  assert.equal(edge.includes("headers.set(COUNTRY_HEADER_NAME, countryCode)"), true);
  assert.equal(edge.includes("context.next(new Request(request, { headers }))"), true);

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(edge).toString("base64")}`;
  const { default: appLocale } = await import(moduleUrl);
  let forwardedRequest;
  const context = {
    geo: { country: { code: "pl" } },
    next(request) {
      forwardedRequest = request;
      return new Response("ok");
    },
  };

  const response = await appLocale(new Request("https://example.test/", { headers: { accept: "text/html" } }), context);
  assert.equal(response.status, 200);
  assert.equal(forwardedRequest.headers.get("x-opencivera-country-code"), "PL");
  assert.equal(
    await appLocale(new Request("https://example.test/api", { method: "POST", headers: { accept: "application/json" } }), context),
    undefined,
  );
});

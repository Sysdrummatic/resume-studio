import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

// Isolated browser check of the real editor (tests/fixtures/dashboard-browser.tsx
// in `?editor` mode) with mocked resume APIs: the save and retry flows for
// legacy-pairing conflicts and partial saves, in the English and Polish UI.
// It proves the editor's behavior, not Supabase's.
test(
  "editor save and retry for legacy conflicts and partial saves (isolated, EN/PL)",
  { skip: process.env.EDITOR_BROWSER_TEST !== "1", timeout: 180000 },
  async () => {
    const require = createRequire(import.meta.url);
    const { webpack } = require("next/dist/compiled/webpack/webpack");
    const { chromium } = await import("playwright");
    const output = path.resolve("tmp/editor-save-retry-browser");
    await mkdir(output, { recursive: true });
    await new Promise((resolve, reject) => {
      const compiler = webpack({
        mode: "development",
        devtool: false,
        entry: path.resolve("tests/fixtures/dashboard-browser.tsx"),
        output: { path: output, filename: "bundle.js" },
        resolve: { extensions: [".tsx", ".ts", ".js"] },
        module: { rules: [{ test: /\.(tsx?|css)$/, exclude: /node_modules/, use: path.resolve("tests/helpers/dashboard-browser-loader.cjs") }] },
      });
      compiler.run((error, stats) => compiler.close(() => (error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve())));
    });

    let uiLocale = "en";
    const dictionaries = {
      en: yaml.load(await readFile("app/i18n/locales/en.yaml", "utf8")),
      pl: yaml.load(await readFile("app/i18n/locales/pl.yaml", "utf8")),
    };
    const server = createServer(async (req, res) => {
      try {
        if (req.url === "/fixture-i18n.json") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ locale: uiLocale, locales: [{ code: uiLocale, name: uiLocale, nativeName: uiLocale }], dictionary: dictionaries[uiLocale] }));
        } else if (req.url === "/bundle.js") {
          res.setHeader("Content-Type", "text/javascript");
          res.end(await readFile(path.join(output, "bundle.js")));
        } else {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script>window.process={env:{}};</script><script src="/bundle.js"></script></body></html>');
        }
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const text = (locale, key, params) => Object.entries(params).reduce((value, [name, replacement]) => value.replaceAll(`{${name}}`, replacement), dictionaries[locale].editor.text[key]);

    const LEGACY_AMBIGUOUS = "{locale}: the order of this older language version's entries cannot be verified ({collections}), so it was left unchanged. Save this language version and confirm the order to link it.";
    const LEGACY_PROMPT = "{locale}: are the entries in {collections} in the same order as in the default language? They will be linked by their order.";
    const LEGACY_ORDER = "{locale}: this older language version does not match the default language's entries ({collections}), so it was left unchanged. Make its entries match the default language, then save again.";
    const PARTIAL = "{locale}: saved, but the revision history or public profile could not be updated. Save again to finish.";
    const SAVED = "Saved {count} language versions.";

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const dialogs = [];
      page.on("dialog", async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.accept();
      });

      async function openPolishTab(scenario) {
        const fixture = await (async () => {
          await page.goto(`${base}/?editor`);
          return page.evaluate(() => window.dashboardFixture);
        })();
        await page.unroute("**/api/resume/**").catch(() => {});
        await page.route("**/api/resume/languages?withDocuments=true", (route) => route.fulfill({ json: { ok: true, languages: fixture.languageRows } }));
        await page.route("**/api/resume/document?locale=*", (route) => {
          const locale = new URL(route.request().url()).searchParams.get("locale");
          return route.fulfill({ json: { ok: true, actor: { userId: "owner", displayName: "Ada Example", role: "user" }, document: fixture.documents.find((doc) => doc.locale === locale), revisions: [] } });
        });
        const requests = [];
        await page.route("**/api/resume/publish", (route) => {
          const body = route.request().postDataJSON();
          requests.push(body);
          const [status, json] = scenario(body, requests.length, fixture);
          return route.fulfill({ status, json });
        });
        await page.reload();
        const firstName = page.getByLabel(uiLocale === "pl" ? "Imię" : "First name", { exact: true });
        await firstName.waitFor();
        await page.locator(".locale-tab-strip").getByRole("tab", { name: "PL", exact: true }).click();
        await firstName.fill(`Ada ${uiLocale}`);
        return requests;
      }

      async function save() {
        await page.locator(".resume-editor-toolbar, .resume-editor-layout").getByRole("button", { name: dictionaries[uiLocale].editor.text["Save MasterCV"], exact: true }).first().click();
        await page.locator(".dashboard-modal .button--primary").click();
        await page.locator(".dashboard-modal").waitFor({ state: "detached" }).catch(() => {});
      }

      const toast = async (expected) => {
        await page.locator(".status-toast", { hasText: expected }).first().waitFor();
        return page.locator(".status-toast").last().innerText();
      };
      const polishDocument = (fixture, updatedAt) => ({ ...fixture.documents[1], updated_at: updatedAt });
      const conflict = (reason) => ({ code: "legacy-pairing", error: "English server text", legacyConflicts: [reason === "ambiguous" ? { collection: "interests", reason } : { collection: "experience", reason, index: 0 }] });

      for (const locale of ["en", "pl"]) {
        uiLocale = locale;
        const params = { locale: "pl" };

        // Ambiguous order: the user is asked in the UI language, the save is resent once and succeeds.
        dialogs.length = 0;
        const ambiguous = await openPolishTab((body, count, fixture) =>
          body.confirmLegacyPairing ? [200, { ok: true, document: polishDocument(fixture, "v2"), revisions: [] }] : [409, conflict("ambiguous")]);
        await save();
        const saved = await toast(text(locale, SAVED, { count: "1" }));
        assert.deepEqual(dialogs, [text(locale, LEGACY_PROMPT, { ...params, collections: "interests" })], `${locale}: the confirmation is localized`);
        assert.deepEqual(ambiguous.map((body) => body.confirmLegacyPairing === true), [false, true]);
        assert.doesNotMatch(saved, /English server text/);

        // Order conflict: never offered for confirmation, shown from the dictionary.
        dialogs.length = 0;
        const order = await openPolishTab(() => [409, conflict("order")]);
        await save();
        const refused = await toast(text(locale, LEGACY_ORDER, { ...params, collections: "experience" }));
        assert.equal(order.length, 1);
        assert.deepEqual(dialogs, []);
        assert.doesNotMatch(refused, /English server text/);

        // Partial save: the stored version becomes the base, and "save again" finishes it.
        const partial = await openPolishTab((body, count, fixture) => count === 1
          ? [500, { error: "English server text", saved: true, incomplete: ["revision"], document: polishDocument(fixture, "v3"), revisions: [] }]
          : [200, { ok: true, document: polishDocument(fixture, "v4"), revisions: [] }]);
        await save();
        const unfinished = await toast(text(locale, PARTIAL, params));
        assert.doesNotMatch(unfinished, /English server text/);
        await save();
        await toast(text(locale, SAVED, { count: "1" }));
        assert.deepEqual(partial.map((body) => body.baseUpdatedAt), ["2026-09-08T12:00:00Z", "v3"], `${locale}: the retry sends the stored version, not the stale one`);
        await page.screenshot({ path: path.join(output, `editor-retry-${locale}.png`) });
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser?.close();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

test(
  "dashboard browser regression (isolated data/API, real renderer)",
  { skip: process.env.DASHBOARD_BROWSER_TEST !== "1", timeout: 120000 },
  async () => {
    const require = createRequire(import.meta.url);
    const { webpack } = require("next/dist/compiled/webpack/webpack");
    const { chromium } = await import("playwright");
    const output = path.resolve("tmp/dashboard-browser");
    await mkdir(output, { recursive: true });
    await new Promise((resolve, reject) => {
      const compiler = webpack({
        mode: "development",
        devtool: false,
        entry: path.resolve("tests/fixtures/dashboard-browser.tsx"),
        output: { path: output, filename: "bundle.js" },
        resolve: { extensions: [".tsx", ".ts", ".js"] },
        module: {
          rules: [
            {
              test: /\.(tsx?|css)$/,
              exclude: /node_modules/,
              use: path.resolve("tests/helpers/dashboard-browser-loader.cjs")
            }
          ]
        }
      });
      compiler.run((error, stats) =>
        compiler.close(() =>
          error || stats.hasErrors()
            ? reject(error || new Error(stats.toString({ all: false, errors: true })))
            : resolve()
        )
      );
    });
    const server = createServer(async (req, res) => {
      try {
        if (req.url === "/bundle.js") {
          res.setHeader("Content-Type", "text/javascript");
          res.end(await readFile(path.join(output, "bundle.js")));
        } else if (req.url === "/test-geist.woff2") {
          res.end(await readFile("node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2"));
        } else if (req.url?.startsWith("/fonts/")) {
          res.end(await readFile(path.join(process.cwd(), "public", req.url)));
        } else {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(
            '<!doctype html><html data-app-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@font-face{font-family:Geist;src:url(/test-geist.woff2);font-weight:100 900}:root{--font-geist-sans:Geist;--font-geist-mono:monospace}</style></head><body><div id="root"></div><script>window.process={env:{}};</script><script src="/bundle.js"></script></body></html>'
          );
        }
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const base = `http://127.0.0.1:${server.address().port}`;
      await page.goto(base);
      try {
        await page
          .getByRole("progressbar", { name: "Master Resume completion" })
          .waitFor({ timeout: 8000 });
      } catch (error) {
        await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true });
        throw new Error(
          `${error.message}\nBrowser errors: ${JSON.stringify(errors)}\n${await page.locator("body").innerText()}`
        );
      }
      assert.equal(await page.locator(".dashboard-library-item").count(), 3);
      assert.equal(await page.getByRole("navigation", { name: "Breadcrumb" }).count(), 1);
      const headerBox = await page.locator(".app-header").boundingBox();
      const breadcrumbBox = await page
        .getByRole("navigation", { name: "Breadcrumb" })
        .boundingBox();
      assert.ok(
        Math.abs(breadcrumbBox.y - headerBox.y - headerBox.height) <= 1,
        "Breadcrumbs sit directly below the existing top navigation"
      );
      await page.evaluate(() => document.fonts.ready);
      const preview = page.locator(".dashboard-library-preview");
      assert.equal(
        await preview
          .locator(
            '[data-cv-text-size="large"][data-cv-density="compact"][data-cv-header-photo="off"]'
          )
          .count(),
        1
      );
      assert.doesNotMatch(
        await preview.innerText(),
        /UNSELECTED|PRIVATE COMPANY|PRIVATE SKILL|Private role/
      );
      await preview.getByRole("button", { name: "Polski", exact: true }).click();
      await preview.getByText("Projektantka", { exact: true }).waitFor();
      await preview.getByRole("button", { name: "English", exact: true }).click();
      await preview.getByRole("button", { name: "Open CV", exact: true }).click();
      const expanded = page.getByRole("dialog", { name: "CV Version CV preview", exact: true });
      await expanded.waitFor();
      assert.equal(await expanded.locator('[data-cv-density="compact"]').count(), 1);
      await expanded.getByRole("button", { name: "Close", exact: true }).click();
      const search = page.getByRole("searchbox", { name: "Search CV versions" });
      await search.fill("no matching title");
      await page.getByText("No CV selected", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Clear filters", exact: true }).click();
      await page.locator(".dashboard-library-item").filter({ hasText: "Private designer" }).click();
      assert.equal(await page.getByRole("button", { name: "Copy link", exact: true }).count(), 0);
      assert.equal(
        await preview.getByRole("button", { name: "PDF", exact: true }).isDisabled(),
        true,
        "Private preview must retain the draft-PDF feature gate"
      );
      await page.locator(".dashboard-library-item").filter({ hasText: "Onboarding test" }).click();
      assert.equal(
        await preview.count(),
        0,
        "A test draft must never fall back to the real Master CV"
      );
      assert.equal(
        await page.getByRole("link", { name: "Open test CV" }).getAttribute("href"),
        "/onboarding/test-cv/isolated-test"
      );
      assert.equal(await page.getByRole("button", { name: "Edit selection" }).count(), 0);
      await page.locator(".dashboard-library-item").filter({ hasText: "Private designer" }).click();
      const fixture = await page.evaluate(() => window.dashboardFixture);
      let saved = fixture.presets[1];
      const requests = [];
      let failPublish = true;
      await page.route("**/api/resume/presets/**", async (route) => {
        const request = route.request();
        const body = request.postDataJSON();
        requests.push({ url: request.url(), method: request.method(), body });
        if (request.url().endsWith("/publish")) {
          if (failPublish) {
            failPublish = false;
            await route.fulfill({ status: 500, json: { error: "Temporary publish failure" } });
            return;
          }
          saved = { ...saved, is_public: true, canonical_public_path: "/ada-example/private-cv" };
        } else if (request.url().endsWith("/unpublish")) saved = { ...saved, is_public: false };
        else if (request.method() === "PATCH")
          saved = { ...saved, title: body.title, selection: body.selection };
        await route.fulfill({ json: { ok: true, preset: saved } });
      });
      await page.getByRole("button", { name: "Edit selection", exact: true }).click();
      const edit = page.getByRole("dialog", { name: "CV Version editor", exact: true });
      await edit.getByLabel("CV Version title", { exact: true }).fill("Updated designer");
      await edit.getByRole("button", { name: "Save CV Version", exact: true }).click();
      await page
        .locator(".dashboard-library-item")
        .filter({ hasText: "Updated designer" })
        .waitFor();
      assert.deepEqual(requests.at(-1).body.selection, fixture.presets[1].selection);
      assert.equal(requests.at(-1).body.documentId, "document-en");
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      const publish = page.getByRole("dialog", { name: "Publish CV Version", exact: true });
      await publish.getByRole("button", { name: "Publish CV Version", exact: true }).click();
      await page.getByText("Temporary publish failure", { exact: true }).waitFor();
      assert.equal(
        await publish.isVisible(),
        true,
        "Retry keeps the user's publish dialog and choices"
      );
      await publish.getByRole("button", { name: "Publish CV Version", exact: true }).click();
      await page.getByRole("button", { name: "Copy link", exact: true }).waitFor();
      assert.deepEqual(requests.at(-1).body.selectedLocales, ["en", "pl"]);
      assert.equal(requests.at(-1).body.defaultLocale, "en");
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy link", exact: true }).click();
      await page.getByText("Public link copied to clipboard.", { exact: true }).waitFor();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        `${base}/ada-example/private-cv`
      );
      const menu = page.locator(".dashboard-preset-menu");
      await menu.locator("summary").click();
      const popupPromise = page.waitForEvent("popup");
      await menu.getByRole("menuitem", { name: "ATS (TXT)", exact: true }).click();
      const popup = await popupPromise;
      assert.equal(new URL(popup.url()).pathname, "/api/resume/export/text");
      assert.equal(new URL(popup.url()).searchParams.get("personSlug"), "ada-example");
      assert.equal(new URL(popup.url()).searchParams.get("publicId"), "private-cv");
      await popup.close();
      await menu.locator("summary").click();
      await menu.getByRole("menuitem", { name: "Unpublish", exact: true }).click();
      await page.getByRole("button", { name: "Publish", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Copy link", exact: true }).count(), 0);
      await menu.locator("summary").click();
      await menu
        .getByRole("menuitem", { name: "Delete CV Version Updated designer", exact: true })
        .click();
      const deletion = page.getByRole("dialog", { name: "Delete CV Version confirmation" });
      await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(requests.filter((r) => r.method === "DELETE").length, 0);
      await menu.locator("summary").click();
      await menu
        .getByRole("menuitem", { name: "Delete CV Version Updated designer", exact: true })
        .click();
      await deletion.getByRole("button", { name: "Delete", exact: true }).click();
      await page
        .locator(".dashboard-library-item")
        .filter({ hasText: "Updated designer" })
        .waitFor({ state: "detached" });
      assert.equal(requests.filter((r) => r.method === "DELETE").length, 1);
      await preview.getByText("Published designer", { exact: true }).waitFor();
      await page.locator('input[type="file"]').setInputFiles({
        name: "backup.yaml",
        mimeType: "text/yaml",
        buffer: Buffer.from("test: fixture")
      });
      const transfer = page.getByRole("dialog", { name: "Import data confirmation" });
      await transfer.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.goto(base);
      await page.getByRole("progressbar", { name: "Master Resume completion" }).waitFor();
      const filters = page.getByRole("group", { name: "Filter CV versions" });
      await filters.getByRole("button", { name: "Private", exact: true }).focus();
      await page.keyboard.press("Space");
      assert.equal(await page.locator(".dashboard-library-item").count(), 2);
      await filters.getByRole("button", { name: "All", exact: true }).focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".dashboard-library-item").count(), 3);
      assert.equal(
        await filters
          .getByRole("button", { name: "All", exact: true })
          .evaluate((element) => getComputedStyle(element).outlineStyle),
        "solid"
      );
      await page.locator(".dashboard-library-item").filter({ hasText: "Private designer" }).click();
      await page.route("**/api/resume/presets", (route) =>
        route.fulfill({
          json: {
            ok: true,
            preset: {
              ...fixture.presets[1],
              id: "created",
              title: route.request().postDataJSON().title
            }
          }
        })
      );
      await page.getByRole("button", { name: "Create CV version", exact: true }).first().click();
      const create = page.getByRole("dialog", { name: "CV Version editor", exact: true });
      await create.getByLabel("CV Version title", { exact: true }).fill("New opportunity");
      await create.getByRole("button", { name: "Save CV Version", exact: true }).click();
      await page
        .locator(".dashboard-library-item")
        .filter({ hasText: "New opportunity" })
        .waitFor();
      assert.equal(
        await preview.getByRole("heading", { name: "New opportunity" }).count(),
        1,
        "A newly saved CV becomes the selected preview"
      );
      await page.goto(base);
      await page.getByRole("progressbar", { name: "Master Resume completion" }).waitFor();
      await page.screenshot({ path: path.join(output, "desktop-dark.png"), fullPage: true });
      for (const theme of ["dark", "light"]) {
        await page.evaluate((theme) => (document.documentElement.dataset.appTheme = theme), theme);
        if (theme === "light")
          await page.screenshot({ path: path.join(output, "desktop-light.png"), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await preview.getByRole("button", { name: "Polski", exact: true }).click();
        const languageButton = await preview
          .getByRole("button", { name: "Polski", exact: true })
          .boundingBox();
        assert.ok(
          languageButton.height >= 24,
          "Mobile CV controls stay readable without shrinking the entire document"
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `mobile-${theme}.png`), fullPage: true });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          "No page-level horizontal overflow"
        );
        await page.setViewportSize({ width: 1440, height: 1100 });
      }
      await page.goto(`${base}/?restricted&empty`);
      await page.getByRole("heading", { name: "Start with your master resume" }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Import", exact: true }).count(), 0);
      assert.equal(
        await page.getByRole("button", { name: "Create CV version", exact: true }).isDisabled(),
        true
      );
      await page.route("**/api/resume/languages?withDocuments=true", (route) =>
        route.fulfill({ json: { ok: true, languages: fixture.languageRows } })
      );
      await page.route("**/api/resume/document?locale=*", (route) => {
        const locale = new URL(route.request().url()).searchParams.get("locale");
        return route.fulfill({
          json: {
            ok: true,
            actor: { userId: "owner", displayName: "Ada Example", role: "user" },
            document: fixture.documents.find((doc) => doc.locale === locale),
            revisions: []
          }
        });
      });
      await page.goto(`${base}/?editor`);
      await page.getByLabel("First name", { exact: true }).waitFor();
      await page.waitForFunction(() =>
        [...document.querySelectorAll("input")].some((input) => input.value === "Ada")
      );
      const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
      assert.equal(
        await breadcrumbs.getByRole("link", { name: "Dashboard" }).getAttribute("href"),
        "/dashboard"
      );
      assert.equal(await breadcrumbs.locator('[aria-current="page"]').innerText(), "Master Resume");
      await page.getByLabel("First name", { exact: true }).fill("Ada edited");
      const localeButtons = page.locator(".locale-tab-strip");
      await localeButtons.getByRole("tab", { name: "PL", exact: true }).click();
      await localeButtons.getByRole("tab", { name: "EN", exact: true }).click();
      assert.equal(
        await page.getByLabel("First name", { exact: true }).inputValue(),
        "Ada edited",
        "Breadcrumbs must not disturb locale buffers"
      );
      await page.screenshot({ path: path.join(output, "editor-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, "editor-mobile.png"), fullPage: true });
      assert.equal(await breadcrumbs.isVisible(), true);
      assert.deepEqual(errors, []);
    } finally {
      await browser?.close();
      await new Promise((resolve) => server.close(resolve));
    }
  }
);

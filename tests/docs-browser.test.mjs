import test from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { listDocNavGroups, getDoc } = await import("../app/lib/docs/content.ts");
const { renderMarkdownWithOutline } = await import("../app/lib/docs/markdown.ts");

test(
  "docs workspace browser regression (real components, isolated content)",
  { skip: process.env.DOCS_BROWSER_TEST !== "1", timeout: 120000 },
  async () => {
    const require = createRequire(import.meta.url);
    const { webpack } = require("next/dist/compiled/webpack/webpack");
    const { chromium } = await import("playwright");
    const output = path.resolve("tmp/docs-browser");
    await mkdir(output, { recursive: true });
    await new Promise((resolve, reject) => {
      const compiler = webpack({
        mode: "development",
        devtool: false,
        entry: path.resolve("tests/fixtures/docs-browser.tsx"),
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
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/fixture.json") {
        const groups = url.searchParams.has("empty")
          ? []
          : listDocNavGroups(url.searchParams.has("eligible"));
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            groups,
            ...renderMarkdownWithOutline(getDoc("tutorials", "publishing-your-first-cv").markdown)
          })
        );
      } else if (url.pathname.startsWith("/docs/tutorials/publishing-your-first-cv/resources/")) {
        const file = path.basename(url.pathname);
        try {
          res.setHeader("Content-Type", "image/png");
          res.end(
            await readFile(
              path.join("content/docs/tutorials/publishing-your-first-cv/resources", file)
            )
          );
        } catch {
          res.writeHead(404);
          res.end();
        }
      } else if (req.url === "/bundle.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(await readFile(path.join(output, "bundle.js")));
      } else if (req.url === "/test-geist.woff2")
        res.end(await readFile("node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2"));
      else {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(
          '<!doctype html><html data-app-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:Geist;src:url(/test-geist.woff2);font-weight:100 900}:root{--font-geist-sans:Geist}</style></head><body><div id="root"></div><script>window.process={env:{}}</script><script src="/bundle.js"></script></body></html>'
        );
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const base = `http://127.0.0.1:${server.address().port}`;
      await page.goto(`${base}/docs`);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, "docs-desktop.png"), fullPage: true });
      assert.equal(
        await page.getByRole("navigation", { name: "Breadcrumb" }).count(),
        1,
        "Docs reuse the workspace breadcrumb"
      );
      const header = await page.locator(".app-header").boundingBox();
      const crumb = await page.locator(".workspace-breadcrumbs").boundingBox();
      assert.ok(Math.abs(crumb.y - header.y - header.height) <= 1);
      assert.equal(await page.locator(".docs-topic").count(), 3);
      assert.equal(await page.locator('a[href*="test-scenarios"]').count(), 0);
      await page.keyboard.press("Control+k");
      const search = page.getByRole("searchbox", { name: "Search documentation" });
      assert.equal(await search.evaluate((el) => el === document.activeElement), true);
      await search.fill("NO MATCHING DOCUMENT");
      assert.equal(await page.locator(".docs-topic").count(), 0);
      assert.match(await page.locator(".docs-empty").innerText(), /No topics found/);
      await page.getByRole("button", { name: "Clear search" }).click();
      assert.equal(await page.locator(".docs-topic").count(), 3);
      await search.fill("EXPERIENCE");
      assert.equal(await page.locator(".docs-topic").count(), 1);
      await page.getByRole("button", { name: "Clear search" }).click();
      await page.getByRole("link", { name: "Polski", exact: true }).click();
      await page.getByRole("heading", { name: "Jak możemy Ci pomóc?" }).waitFor();
      await page.getByRole("searchbox").fill("JEZYKOWE");
      assert.equal(await page.locator(".docs-topic").count(), 1);
      await page.getByRole("link", { name: "English", exact: true }).click();
      await page.getByRole("heading", { name: "How can we help?" }).waitFor();

      await page.locator(".docs-topic").first().click();
      await page.locator('[id="1-edit-your-master-resume"]').waitFor();
      assert.ok(page.url().endsWith("#1-edit-your-master-resume"));
      assert.match(
        await page.locator(".workspace-breadcrumbs").innerText(),
        /Home.*Docs.*Tutorials.*Publishing/s
      );
      assert.equal(await page.locator('.docs-nav [aria-current="page"]').count(), 1);
      assert.equal((await page.locator(".docs-outline a").count()) > 0, true);
      await page.locator(".docs-outline a").nth(1).click();
      assert.ok(page.url().includes("#2-create-a-cv-version"));
      assert.equal(
        await page
          .locator(".docs-prose img")
          .first()
          .evaluate((img) => img.complete && img.naturalWidth > 0),
        true
      );
      await page.locator('[id="3-publish-the-cv-version"]').scrollIntoViewIfNeeded();
      assert.ok(
        (await page.locator(".docs-nav").boundingBox()).y >= header.height - 1,
        "Topic navigation remains reachable while reading a long article"
      );

      for (const width of [390, 768, 1440])
        for (const language of ["en", "pl"])
          for (const theme of ["dark", "light"]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const route of ["/docs", "/docs/tutorials/publishing-your-first-cv"]) {
              await page.goto(`${base}${route}?lang=${language}`);
              await page.locator("h1").waitFor();
              await page.evaluate(
                (value) => (document.documentElement.dataset.appTheme = value),
                theme
              );
              assert.equal(
                await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
                false,
                `${route}, ${width}, ${language}, ${theme}`
              );
              if (language === "en" && width !== 768)
                await page.screenshot({
                  path: path.join(
                    output,
                    `${route === "/docs" ? "hub" : "article"}-${width}-${theme}.png`
                  ),
                  fullPage: route === "/docs"
                });
            }
          }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/docs`);
      const menu = page.getByRole("button", { name: "Docs menu", exact: true });
      await menu.click();
      assert.equal(await page.locator(".docs-sidebar").isVisible(), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".docs-sidebar").isVisible(), false);
      assert.equal(await menu.evaluate((el) => el === document.activeElement), true);
      assert.notEqual(await menu.evaluate((el) => getComputedStyle(el).outlineStyle), "none");
      await menu.click();
      await page.getByRole("link", { name: "Master Resume", exact: true }).click();
      await page.locator(".docs-article").waitFor();
      assert.equal(await page.locator(".docs-sidebar").isVisible(), false);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${base}/docs?eligible=1`);
      await page.locator("h1").waitFor();
      assert.equal(await page.locator('a[href*="test-scenarios"]').count(), 2);
      await page.getByRole("searchbox").fill("sign-up");
      assert.equal(await page.locator(".docs-resources a").count(), 1);
      await page.goto(`${base}/docs?empty=1`);
      await page.locator(".docs-empty").waitFor();
      assert.equal(await page.locator(".docs-feature, .docs-topic").count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  }
);

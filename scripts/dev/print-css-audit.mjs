#!/usr/bin/env node
/**
 * Local, dev-only print CSS audit for the public CV route.
 *
 * Renders /{personSlug}/{publicId} with print media emulated and writes both a
 * real paginated PDF and a full-page screenshot to tmp/print-audit/ (gitignored).
 *
 * This script is never bundled or deployed — `playwright` is a devDependency and
 * nothing in app/ imports this file.
 *
 * Usage:
 *   node scripts/dev/print-css-audit.mjs <personSlug> <publicId> [options]
 *
 * Options:
 *   --base=<url>   Base URL of a running dev server (default http://localhost:3000)
 *   --lang=<code>  Locale to request via ?lang= (default: route's own default)
 *   --label=<name> Filename prefix, useful for labelling short vs long cases
 *
 * Example:
 *   npm run dev
 *   node scripts/dev/print-css-audit.mjs steevetantums 0c4341285a0149 --label=long
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUTPUT_DIR = path.join(process.cwd(), "tmp", "print-audit");

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) {
      flags[match[1]] = match[2];
    } else {
      positional.push(arg);
    }
  }

  const [personSlug, publicId] = positional;
  if (!personSlug || !publicId) {
    throw new Error(
      "Usage: node scripts/dev/print-css-audit.mjs <personSlug> <publicId> [--base=url] [--lang=en] [--label=name]",
    );
  }

  return {
    personSlug,
    publicId,
    base: (flags.base || "http://localhost:3000").replace(/\/+$/, ""),
    lang: flags.lang || "",
    label: flags.label || "cv",
  };
}

/**
 * Page count straight off the PDF bytes. Not a general PDF parser — it only has
 * to be right for Chromium's own uncompressed page tree, and it doubles as the
 * sanity check that the render produced a real document.
 */
function countPdfPages(buffer) {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

async function main() {
  const { personSlug, publicId, base, lang, label } = parseArgs(process.argv.slice(2));

  const target = new URL(`${base}/${encodeURIComponent(personSlug)}/${encodeURIComponent(publicId)}`);
  if (lang) {
    target.searchParams.set("lang", lang);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const consoleErrors = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(target.toString(), { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`Route returned ${response ? response.status() : "no response"} for ${target}`);
    }

    // Fonts must be settled before measuring anything, or the PDF paginates
    // against fallback metrics and every break position is wrong.
    await page.evaluate(() => document.fonts.ready);

    await page.emulateMedia({ media: "print" });

    const renderedFont = await page.evaluate(() => {
      const heading = document.querySelector(".hero__title h1, h1");
      return heading ? getComputedStyle(heading).fontFamily : "(no h1 found)";
    });

    const chromeVisibility = await page.evaluate(() => {
      const probe = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return "absent-from-dom";
        return getComputedStyle(element).display === "none" ? "hidden" : "VISIBLE";
      };
      return {
        ".app-header": probe(".app-header"),
        ".hero__actions": probe(".hero__actions"),
        ".hero__export-group": probe(".hero__export-group"),
        ".resume-language-switcher": probe(".resume-language-switcher"),
        ".language-switcher": probe(".language-switcher"),
        ".resume-badges": probe(".resume-badges"),
      };
    });

    const layoutMode = await page.evaluate(() => {
      const layout = document.querySelector(".layout");
      if (!layout) return "(no .layout element)";
      const styles = getComputedStyle(layout);
      return `${styles.display} / grid-template-columns: ${styles.gridTemplateColumns}`;
    });

    // Slugified, because every part of this comes from argv and path.join()
    // happily follows a `../` out of tmp/print-audit.
    const stem = `${label}-${personSlug}-${publicId}${lang ? `-${lang}` : ""}`
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "audit";

    const pdf = await page.pdf({
      path: path.join(OUTPUT_DIR, `${stem}.pdf`),
      format: "A4",
      printBackground: true,
    });

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${stem}-fullpage.png`),
      fullPage: true,
    });

    const summary = {
      url: target.toString(),
      pdf: path.join("tmp", "print-audit", `${stem}.pdf`),
      screenshot: path.join("tmp", "print-audit", `${stem}-fullpage.png`),
      pdfPages: countPdfPages(pdf),
      pdfBytes: pdf.length,
      headingFontFamily: renderedFont,
      layoutUnderPrint: layoutMode,
      chromeUnderPrint: chromeVisibility,
      consoleErrors,
    };

    await writeFile(path.join(OUTPUT_DIR, `${stem}.json`), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    if (summary.pdfPages < 1) {
      throw new Error("Rendered PDF reports zero pages — the route probably did not render.");
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

// Browser QA for the CSS 3D landing (issue #290): run against a running app, see docs/runbooks/testing-and-validation.md.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { chromium } from "playwright";

const origin = process.env.QA_BASE_URL || "http://localhost:3000";
const screenshots = process.env.QA_SCREENSHOTS || (await mkdtemp(path.join(tmpdir(), "ocv-landing-")));
const dictionary = (lang) => yaml.load(readFileSync(`app/i18n/locales/${lang}/landing.yaml`, "utf8")).landing;
const sampleUrl = yaml.load(readFileSync("content/landing.yaml", "utf8")).sample_livecv.url;
const STAGES = 9;
const FEATS = 7;
const browser = await chromium.launch({ headless: true });
const failures = [];
const errors = [];

/* every check runs; the report lists all that failed */
async function check(name, run) {
  try {
    await run();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message.split("\n")[0]}`);
    console.log(`  FAIL  ${name}\n        ${error.message.split("\n")[0]}`);
  }
}

async function open(options = {}, url = `${origin}/`) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${url}: ${error.message}`));
  await page.goto(url);
  if (options.javaScriptEnabled !== false) await page.waitForSelector("[data-stage-root][data-ready]");
  await page.waitForTimeout(600);
  return { context, page };
}

async function goStage(page, stage, settle = 3500) {
  await page.locator("[data-rail] button").nth(stage).click();
  await page.waitForFunction((value) => document.querySelector("[data-stage-root]")?.dataset.stage === String(value), stage);
  await page.waitForTimeout(settle);
}

/* what has the focus: hidden from assistive tech, inside a faded caption or label, or not visible at all */
const focused = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const opacity = (node) => (node ? Number(getComputedStyle(node).opacity) : 1);
    const box = el.getBoundingClientRect();
    return {
      name: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40),
      hidden: Boolean(el.closest('[aria-hidden="true"]')),
      caption: opacity(el.closest("[data-caption]")),
      label: opacity(el.closest("[data-label]")),
      visible: box.width > 0 && box.height > 0,
    };
  });

/* requestAnimationFrame calls per painted frame: two loops running at once would double it */
async function rafPerFrame(page, ms = 1200) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const start = window.__rafCalls;
        let frames = 0;
        const t0 = performance.now();
        const count = () => {
          frames += 1;
          if (performance.now() - t0 < duration) window.__origRaf(count);
          else resolve((window.__rafCalls - start) / frames);
        };
        window.__origRaf(count);
      }),
    ms,
  );
}

const countRaf = () => {
  /* the init script runs on every navigation: wrap the original once */
  if (window.__origRaf) return;
  window.__origRaf = window.requestAnimationFrame.bind(window);
  window.__rafCalls = 0;
  window.requestAnimationFrame = (callback) => {
    window.__rafCalls += 1;
    return window.__origRaf(callback);
  };
};

const activeWord = (page) => page.locator(".lp-rot__word.is-active").first().textContent();

try {
  console.log(`Landing QA against ${origin}; screenshots: ${screenshots}`);

  console.log("1. Focus and the sample LiveCV link");
  {
    const { context, page } = await open();
    await check("Tab and Shift+Tab never land on a hidden or faded control", async () => {
      const bad = [];
      for (const key of ["Tab", "Shift+Tab"]) {
        for (let i = 0; i < 28; i += 1) {
          await page.keyboard.press(key);
          const info = await focused(page);
          /* nextjs-portal is the dev-only Next.js overlay */
          if (info && info.name !== "NEXTJS-PORTAL" && (info.hidden || info.caption <= 0.5 || info.label <= 0.5 || !info.visible)) bad.push(`${key} → ${info.name}`);
        }
      }
      assert.deepEqual(bad, []);
    });
    await goStage(page, STAGES - 1);
    await check("the sample LiveCV link is a real, reachable link outside the decorative scene", async () => {
      const link = page.locator('a[data-label="url"]');
      assert.equal(await link.getAttribute("href"), sampleUrl);
      assert.equal(await link.evaluate((el) => Boolean(el.closest('[aria-hidden="true"]'))), false);
      assert.ok(await link.isVisible());
      await link.focus();
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.label), "url");
    });
    await goStage(page, FEATS);
    await check("closing a feature (Escape or its close button) gives the focus back to the control that opened it", async () => {
      const opener = page.locator("[class*=featureList] button").first();
      for (const close of ["Escape", "button"]) {
        await opener.focus();
        await page.keyboard.press("Enter");
        await page.locator("[data-feature-card]:not([hidden])").waitFor();
        if (close === "Escape") await page.keyboard.press("Escape");
        else await page.locator("[data-feature-card] button").click();
        await page.locator("[data-feature-card][hidden]").waitFor({ state: "attached" });
        assert.equal(await opener.evaluate((el) => el === document.activeElement), true, `after ${close}`);
      }
    });
    await page.screenshot({ path: path.join(screenshots, "feats-desktop.png") });
    await context.close();
  }

  console.log("2. Without JavaScript");
  {
    const { context, page } = await open({ javaScriptEnabled: false });
    await check("the page opens at the top", async () => {
      const box = await page.locator("h1").boundingBox();
      assert.ok(box && box.y >= 0 && box.y < 900, `h1 at ${box?.y}`);
    });
    await check("it scrolls all the way to the footer", async () => {
      for (let i = 0; i < 40; i += 1) await page.mouse.wheel(0, 900);
      await page.waitForTimeout(600);
      const box = await page.locator("footer").last().boundingBox();
      assert.ok(box && box.y + box.height <= 901 && box.y >= 0, `footer at ${box?.y}`);
    });
    await page.goto(`${origin}/#faq`);
    await page.waitForTimeout(600);
    await check("/#faq shows the FAQ and its questions open natively", async () => {
      const faq = page.locator("#faq");
      assert.ok(await faq.isVisible(), "#faq visible");
      const first = faq.locator("details").first();
      await first.locator("summary").click();
      assert.notEqual(await first.getAttribute("open"), null);
    });
    await page.screenshot({ path: path.join(screenshots, "no-js-faq.png") });
    await context.close();
  }

  console.log("3. Stage names on a phone");
  for (const lang of ["pl", "en"]) {
    const { context, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, `${origin}/?lang=${lang}`);
    await check(`${lang}: every stage button has its name; the active one is marked`, async () => {
      const copy = dictionary(lang);
      const labels = [copy.story.start_label, ...copy.story.stages.map((stage) => stage.label)];
      const buttons = page.locator("[data-rail] button");
      assert.equal(await buttons.count(), STAGES);
      for (const [index, label] of labels.entries()) {
        await page.getByRole("button", { name: label, exact: true }).first().waitFor({ state: "attached", timeout: 2000 });
        assert.equal(await buttons.nth(index).getAttribute("aria-current"), index === 0 ? "step" : null);
      }
    });
    await context.close();
  }

  console.log("4. Reduced motion switched on and off in an open tab");
  {
    const { context, page } = await open();
    await page.addInitScript(countRaf);
    await page.reload();
    await page.waitForSelector("[data-stage-root][data-ready]");
    await page.waitForTimeout(800);
    await page.locator("[data-rail] button").nth(1).click();
    const baseline = await rafPerFrame(page);
    for (let round = 1; round <= 3; round += 1) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(700);
      await check(`round ${round}: reduce stops the scene loop and the rotating word at once`, async () => {
        const calls = await rafPerFrame(page, 1000);
        assert.ok(calls < 0.05, `${calls.toFixed(2)} rAF calls per frame while reduced`);
        const word = await activeWord(page);
        await page.waitForTimeout(2600);
        assert.equal(await activeWord(page), word, "the word stays");
      });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForTimeout(300);
      await check(`round ${round}: back to full motion, one loop and the word rotates again`, async () => {
        await page.locator("[data-rail] button").nth(round % 2 === 0 ? 1 : 2).click();
        const calls = await rafPerFrame(page);
        assert.ok(calls <= baseline + 0.2, `${calls.toFixed(2)} rAF calls per frame (baseline ${baseline.toFixed(2)})`);
        await goStage(page, 0, 300);
        const word = await activeWord(page);
        await page.waitForFunction((before) => document.querySelector(".lp-rot__word.is-active")?.textContent !== before, word, { timeout: 6000 });
      });
    }
    await context.close();
  }

  console.log("5. Phone feature carousel");
  {
    const { context, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await goStage(page, FEATS, 2500);
    const list = page.locator("[class*=featureList]");
    const left = () => list.evaluate((el) => Math.round(el.scrollLeft));
    await check("it drifts on its own", async () => {
      const start = await left();
      await page.waitForTimeout(1500);
      assert.notEqual(await left(), start);
    });
    await check("focus inside the list holds it for as long as the focus stays (> 4s)", async () => {
      await list.locator("button").first().focus();
      await page.waitForTimeout(400);
      const held = await left();
      await page.waitForTimeout(5000);
      assert.equal(await left(), held);
    });
    await check("leaving the list lets it drift again", async () => {
      await page.locator("[data-rail] button").first().focus();
      const start = await left();
      await page.waitForTimeout(5200);
      assert.notEqual(await left(), start);
    });
    await check("a finger scroll takes over, then the drift resumes", async () => {
      await list.dispatchEvent("pointerdown", { pointerType: "touch" });
      await list.evaluate((el) => el.scrollBy(60, 0));
      await page.waitForTimeout(500);
      const after = await left();
      await page.waitForTimeout(2000);
      assert.equal(await left(), after, "held after the touch");
      await page.waitForTimeout(3500);
      assert.notEqual(await left(), after, "drifts again");
    });
    await context.close();
  }

  console.log("6. Short computer window");
  for (const how of ["Escape", "button"]) {
    const { context, page } = await open({ viewport: { width: 1280, height: 460 } });
    await check(`${how} on the screen leads to the simplified version`, async () => {
      const dialog = page.locator("dialog[class*=shortScreen]");
      await dialog.waitFor({ state: "visible" });
      if (how === "Escape") await page.keyboard.press("Escape");
      else await dialog.locator("button").click();
      await dialog.waitFor({ state: "hidden" });
      assert.notEqual(await page.locator("[data-stage-root]").getAttribute("data-simple"), null);
      assert.equal(await page.locator("[data-caption] p").first().isVisible(), false, "only the headings show");
    });
    await page.screenshot({ path: path.join(screenshots, `short-${how}.png`) });
    await context.close();
  }

  console.log("7. Frames for comparison and the routes around the landing");
  for (const [device, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    for (const lang of ["pl", "en"]) {
      for (const colorScheme of ["light", "dark"]) {
        const { context, page } = await open({ viewport, colorScheme }, `${origin}/?lang=${lang}`);
        for (const stage of [0, 4, 8]) {
          if (stage) await goStage(page, stage);
          await page.screenshot({ path: path.join(screenshots, `${device}-${lang}-${colorScheme}-${stage}.png`) });
        }
        await context.close();
      }
    }
  }
  {
    const { context, page } = await open();
    await check("CTAs and the example keep their routes; /login renders", async () => {
      assert.ok(await page.locator('a[href*="/login?mode=signup"]').first().isVisible());
      assert.ok((await page.locator('a[href^="/resume"]').count()) > 0);
      const response = await page.goto(`${origin}/login`);
      assert.equal(response.status(), 200);
      assert.equal(await page.locator("h1").count(), 1);
    });
    await context.close();
  }

  await check("no runtime errors in the browser", async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
}

if (failures.length) {
  console.log(`\nLanding QA: ${failures.length} failed\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nLanding QA passed. Screenshots: ${screenshots}`);

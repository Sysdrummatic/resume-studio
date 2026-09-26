import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const origin = process.env.QA_BASE_URL || "http://localhost:3000";
const screenshots = await mkdtemp(path.join(tmpdir(), "ocv-animation-"));
const browser = await chromium.launch({ headless: true });
const errors = [];

async function seek(page, time) {
  await page.locator("#seek").evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, time);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

async function rect(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });
}

async function tiles(page) {
  return page.locator("#tiles .tile").evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width } = element.getBoundingClientRect();
      return { id: element.dataset.record, x, y, width, opacity: Number(element.style.opacity) };
    })
  );
}

try {
  for (const viewport of [
    { width: 1180, height: 660 },
    { width: 358, height: 760 }
  ]) {
    for (const lang of ["pl", "en"]) {
      for (const theme of ["dark", "light"]) {
        console.log(`Checking ${viewport.width}px ${lang} ${theme}`);
        const page = await browser.newPage({ viewport });
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          `${origin}/animations/opencivera-animation.html?embedded=1&lang=${lang}&theme=${theme}`
        );
        await page.locator("#tiles .tile").first().waitFor({ state: "attached" });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page.locator(".transport").isVisible(),
          false,
          "embedded controls must stay hidden"
        );
        assert.equal(
          await page.locator("#viewport").evaluate((element) => element.clientHeight),
          viewport.height
        );

        await seek(page, 5);
        const early = await tiles(page);
        const visible = early.filter((tile) => tile.opacity > 0.1);
        assert.ok(
          visible.length >= 5 && visible.length < 16,
          "collection must reveal progressively"
        );
        assert.ok(
          visible.every((tile) => Math.abs(tile.x - visible[0].x) < 1),
          "collection uses one central column"
        );
        assert.ok(Math.abs(visible[0].x + visible[0].width / 2 - viewport.width / 2) < 1);
        assert.equal(await page.locator(".entry.filled").count(), 0);
        await seek(page, 7);
        assert.ok(
          (await tiles(page))[0].y < early[0].y,
          "camera must track downward along the column"
        );

        await seek(page, 13.5);
        assert.equal(
          await page.locator("#base-group").count(),
          1,
          "Experience Base has a named outline"
        );
        assert.equal(
          await page.locator("#base-group text").textContent(),
          lang === "pl" ? "Baza doświadczeń" : "Experience Base"
        );
        assert.equal(
          await page.locator("#cv-group text").textContent(),
          lang === "pl" ? "Twoje CV" : "Your CVs"
        );
        const waiting = await tiles(page);
        const emptyBase = await rect(page, "#master");
        assert.equal(
          await page
            .locator("#master")
            .evaluate((element) => element.classList.contains("started")),
          false
        );
        assert.equal(
          await page.locator("#master").evaluate((element) => element.style.opacity),
          "1"
        );
        assert.ok(
          waiting.every((tile) => tile.x + tile.width < emptyBase.x),
          "waiting tiles must not overlap the empty base"
        );
        await seek(page, 14.2);
        const inFlight = await tiles(page);
        assert.equal(
          inFlight.filter((tile) => tile.opacity === 0).length,
          1,
          "only the active tile leaves the queue"
        );
        assert.equal(await page.locator(".entry.filled").count(), 0, "entry fills only on arrival");
        for (const tile of inFlight.filter((tile) => tile.opacity > 0)) {
          const before = waiting.find((candidate) => candidate.id === tile.id);
          assert.ok(
            Math.abs(tile.x - before.x) < 0.1 && Math.abs(tile.y - before.y) < 0.1,
            "waiting tiles remain stationary"
          );
        }
        await seek(page, 14.7);
        assert.equal(await page.locator(".entry.filled").count(), 1);
        await seek(page, 26.5);
        assert.equal(await page.locator(".entry.filled").count(), 16);
        assert.ok(
          (await rect(page, "#master")).y < emptyBase.y,
          "base must pan to lower sections while filling"
        );

        await seek(page, 29.5);
        const fullBase = await rect(page, "#master");
        const caption = await rect(page, ".scene-caption");
        assert.ok(
          fullBase.y >= 56 && fullBase.y + fullBase.height <= caption.y,
          "complete base fits before CV creation"
        );
        assert.ok(fullBase.x >= 0 && fullBase.x + fullBase.width <= viewport.width);

        await seek(page, 30.95);
        const arrowBeforeCV = await rect(page, "#group-arrow");
        assert.ok(
          (viewport.width < 768 ? arrowBeforeCV.height : arrowBeforeCV.width) >= 24,
          "arrow is long enough to be visible before the first CV"
        );
        assert.ok(
          await page.locator("#group-arrow").evaluate((el) => Number(el.style.opacity) > 0.9),
          "one arrow appears before the first CV"
        );
        assert.ok(
          await page
            .locator(".output-wrap")
            .evaluateAll((nodes) => nodes.every((el) => Number(el.style.opacity) === 0)),
          "CVs have not appeared ahead of the arrow"
        );

        await seek(page, 33.5);
        const firstCV = await rect(page, '[data-role="product-designer"]');
        assert.ok(
          Math.abs(firstCV.x + firstCV.width / 2 - viewport.width / 2) < 1,
          "first CV starts at the center"
        );
        await seek(page, 41);
        for (const group of ["base-group", "cv-group"]) {
          assert.ok(
            await page.locator("#" + group).evaluate((el) => {
              const outline = el.querySelector("path");
              const label = el.querySelector("text").getBBox();
              const start = outline.getPointAtLength(0);
              const end = outline.getPointAtLength(outline.getTotalLength());
              return start.x < label.x && end.x > label.x + label.width;
            }),
            "top border has a real gap around the label"
          );
        }
        assert.equal(await page.locator("#group-arrow").count(), 1, "later CVs do not add arrows");
        assert.equal(await page.locator("#cv-group").evaluate((el) => el.style.opacity), "1");
        for (const label of ["#base-group text", "#cv-group text"]) {
          const box = await rect(page, label);
          assert.ok(
            box.x >= 0 && box.x + box.width <= viewport.width && box.y >= 56,
            "group names remain in view"
          );
        }
        const cvs = await Promise.all(
          ["product-designer", "design-lead", "product-consultant"].map((role) =>
            rect(page, `[data-role="${role}"]`)
          )
        );
        assert.ok(
          Math.abs(cvs[1].x + cvs[1].width / 2 - viewport.width / 2) < 1,
          "second CV stays centered"
        );
        assert.ok(
          cvs[0].x + cvs[0].width < cvs[1].x && cvs[1].x + cvs[1].width < cvs[2].x,
          "CVs stay in order without overlaps"
        );
        assert.ok(viewport.width - cvs[2].x > 60, "third CV remains visible on mobile");
        if (viewport.width >= 768) {
          const base = await rect(page, "#master");
          assert.ok(
            base.x >= 0 && base.x + base.width < cvs[0].x,
            "desktop retains the complete source document"
          );
        }
        assert.deepEqual(
          await page
            .locator('[data-role="product-designer"] .snippet')
            .evaluateAll((nodes) => nodes.map((node) => node.dataset.record)),
          ["northline", "forma"]
        );
        assert.deepEqual(
          await page
            .locator('[data-role="design-lead"] .snippet')
            .evaluateAll((nodes) => nodes.map((node) => node.dataset.record)),
          ["northline"]
        );
        assert.deepEqual(
          await page
            .locator('[data-role="product-consultant"] .snippet')
            .evaluateAll((nodes) => nodes.map((node) => node.dataset.record)),
          ["consulting"]
        );

        await page.screenshot({
          path: path.join(screenshots, `${viewport.width}-${lang}-${theme}.png`)
        });
        await seek(page, 2);
        await page.locator("#viewport").focus();
        await page.keyboard.press("Space");
        await page.waitForFunction(() => Number(document.querySelector("#seek").value) > 2.1);
        await page.keyboard.press("Space");
        const frozen = await page.locator("#seek").inputValue();
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        );
        assert.equal(
          await page.locator("#seek").inputValue(),
          frozen,
          "keyboard pause stops the animation"
        );
        await seek(page, 41.95);
        await page.keyboard.press("Space");
        await page.waitForFunction(
          () =>
            document.querySelector("#seek").value === "42" &&
            document.querySelector("#pause").textContent !== "Pause" &&
            document.querySelector("#pause").textContent !== "Zatrzymaj animację"
        );
        assert.equal(
          await page.locator("#seek").inputValue(),
          "42",
          "animation ends rather than loops"
        );

        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForFunction(() => document.querySelector("#seek").disabled);
        assert.equal(await page.locator(".entry.filled").count(), 16);
        for (const selector of [
          "#master",
          ...["product-designer", "design-lead", "product-consultant"].map(
            (role) => `[data-role="${role}"]`
          )
        ]) {
          const box = await rect(page, selector);
          const footer = await rect(page, ".scene-caption");
          assert.ok(
            box.x >= 0 &&
              box.x + box.width <= viewport.width &&
              box.y >= 56 &&
              box.y + box.height <= footer.y,
            "reduced motion presents all documents without cropping"
          );
        }
        await page.screenshot({
          path: path.join(screenshots, `${viewport.width}-${lang}-${theme}-reduced.png`)
        });
        await page.close();
      }
    }
  }

  const orders = [];
  for (const random of [0, 0.9]) {
    const page = await browser.newPage();
    await page.addInitScript((value) => {
      Math.random = () => value;
    }, random);
    await page.goto(`${origin}/animations/opencivera-animation.html?lang=pl`);
    assert.equal(
      await page.locator(".transport").isVisible(),
      true,
      "standalone preview retains its controls"
    );
    await seek(page, 10.5);
    orders.push((await tiles(page)).sort((a, b) => a.y - b.y).map((tile) => tile.id));
    await page.setViewportSize({ width: 800, height: 800 });
    await seek(page, 10.5);
    assert.deepEqual(
      (await tiles(page)).sort((a, b) => a.y - b.y).map((tile) => tile.id),
      orders.at(-1),
      "resize must not reshuffle collected experiences"
    );
    await page.close();
  }
  assert.notDeepEqual(orders[0], orders[1], "presentation order uses randomness");

  const home = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  home.on("pageerror", (error) => errors.push(error.message));
  const response = await home.goto(origin);
  assert.equal(response.status(), 200);
  const iframe = home.locator('iframe[src*="opencivera-animation"]');
  await iframe.scrollIntoViewIfNeeded();
  const embedded = home.frameLocator('iframe[src*="opencivera-animation"]');
  await embedded.locator("#tiles .tile").first().waitFor({ state: "attached" });
  assert.equal(await embedded.locator(".transport").isVisible(), false);
  const animationFrame = home
    .frames()
    .find((frame) => frame.url().includes("opencivera-animation.html"));
  await animationFrame.waitForFunction(() => Number(document.querySelector("#seek").value) > 2);
  await iframe.screenshot({ path: path.join(screenshots, "homepage-iframe.png") });
  await home.evaluate(() => window.scrollTo(0, 0));
  await home.waitForTimeout(200);
  const offscreenTime = await embedded.locator("#seek").inputValue();
  await home.waitForTimeout(350);
  assert.equal(
    await embedded.locator("#seek").inputValue(),
    offscreenTime,
    "offscreen iframe pauses playback"
  );
  assert.deepEqual(errors, [], "browser runtime must stay free of errors");
  console.log(
    `Animation QA passed: desktop/mobile × PL/EN × dark/light, reduced motion, keyboard, stable randomness and homepage iframe. Screenshots: ${screenshots}`
  );
} finally {
  await browser.close();
}

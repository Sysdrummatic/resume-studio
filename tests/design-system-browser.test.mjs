// Real App Router + Chromium regressions for the design-system primitives (#288, PR #298).
// Opt-in like the other browser suites: DESIGN_SYSTEM_BROWSER_TEST=1 node --test tests/design-system-browser.test.mjs
// The fixture app (tests/design-system-app) is copied into tmp/ so `next dev` never writes into tests/.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import path from "node:path";

const FIXTURE = path.resolve("tests/design-system-app");
const APP = path.resolve("tmp/design-system-app");
const PORT = 3988;
const BASE = `http://127.0.0.1:${PORT}`;

async function startNext() {
  await rm(APP, { recursive: true, force: true });
  await cp(FIXTURE, APP, { recursive: true });
  const child = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: APP,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  for (let i = 0; i < 120; i += 1) {
    try {
      await fetch(BASE, { signal: AbortSignal.timeout(60000) });
      return { child, log: () => log };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  child.kill();
  throw new Error(`next dev did not start:\n${log}`);
}

const state = (page, name) => page.locator("#state").getAttribute(`data-${name}`).then(Number);
const dialogOpen = (page) => page.evaluate(() => document.querySelector("dialog").open);
const hydrated = (page) => page.locator('#state[data-hydrated="true"]').waitFor({ state: "attached" });
const waitClosed = (page) => page.waitForFunction(() => !document.querySelector("dialog").open, null, { timeout: 2000 });

test("design-system primitives in a real App Router and Chromium", { skip: process.env.DESIGN_SYSTEM_BROWSER_TEST !== "1", timeout: 300000 }, async (t) => {
  const { chromium } = await import("playwright");
  const next = await startNext();
  const browser = await chromium.launch({ headless: true });
  try {
    await t.test("a server page renders Button, TextInput, Select and Textarea (HTTP 200)", async () => {
      const response = await fetch(BASE);
      const html = await response.text();
      assert.equal(response.status, 200, next.log().slice(-3000));
      assert.match(html, /<button type="submit" class="ocv-btn"[^>]*>Zapisz<\/button>/);
      assert.match(html, /<label class="ocv-label" for="[^"]+">Email<\/label>/);
      assert.match(html, /<select class="ocv-input"[^>]*name="locale"/);
      assert.match(html, /<textarea class="ocv-input" rows="4"[^>]*name="note"/);
      assert.match(html, /<a href="\/interactive" class="ocv-btn ocv-btn--quiet">Dalej<\/a>/);
    });

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${BASE}/interactive`);
    await hydrated(page);

    await t.test("busy Button: ARIA cannot be overridden, stays focusable, blocks its action and submit", async () => {
      const busy = page.locator("#busy");
      assert.equal(await busy.getAttribute("aria-disabled"), "true", "busy wins over aria-disabled={false}");
      assert.equal(await busy.getAttribute("aria-busy"), "true");
      assert.equal(await busy.getAttribute("disabled"), null);
      await busy.focus();
      assert.equal(await busy.evaluate((el) => el === document.activeElement), true);
      await busy.click({ force: true }); // Playwright refuses aria-disabled targets; force still sends real mouse events
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      await page.locator("#busy-input").press("Enter");
      assert.equal(await state(page, "clicks"), 0);
      assert.equal(await state(page, "submits"), 0, "activating the busy button submits nothing");
      await page.evaluate(() => document.querySelector("#busy-form").requestSubmit());
      assert.equal(await state(page, "submits"), 1, "other submit paths keep working");

      await page.locator("#toggle-busy").click();
      assert.equal(await busy.getAttribute("aria-disabled"), "false", "not busy: the caller's aria-disabled is kept");
      assert.equal(await busy.getAttribute("aria-busy"), null);
      await busy.click();
      await busy.press("Enter");
      await busy.press("Space");
      await page.locator("#busy-input").press("Enter");
      assert.equal(await state(page, "clicks"), 4, "click, Enter, Space and implicit submission reach onClick");
      assert.equal(await state(page, "submits"), 5);
    });

    await t.test("Modal: rejected Escape, close button and form close keep the dialog open", async () => {
      await page.locator("#accept").click();
      assert.equal(await page.locator("#accept").textContent(), "reject");
      const before = await state(page, "close-calls");
      await page.locator("#opener").click();
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H2", "focus starts on the title");
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }
      assert.equal(await dialogOpen(page), true, "Escape rejected by the parent leaves the dialog open");
      assert.equal(await state(page, "close-calls"), before + 3, "one onClose per Escape");
      await page.getByRole("button", { name: "Zamknij" }).click();
      await page.locator("#confirm").click();
      await page.waitForTimeout(150);
      assert.equal(await dialogOpen(page), true);
      assert.equal(await state(page, "close-calls"), before + 5);
      assert.equal(await page.locator("#state").getAttribute("data-return-value"), "confirm");
    });

    await t.test("Modal: accepted close runs once, keeps returnValue and returns focus", async () => {
      await page.reload();
      await hydrated(page);
      const before = await state(page, "close-calls");
      await page.locator("#opener").click();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await waitClosed(page);
      assert.equal(await state(page, "close-calls"), before + 1, "two quick Escapes during an accepted close call onClose once");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "opener", "focus returns to the opener");

      await page.locator("#opener").click();
      await page.locator("#cancel").click();
      await waitClosed(page);
      assert.equal(await page.locator("#state").getAttribute("data-return-value"), "cancel");
      assert.equal(await page.evaluate(() => document.querySelector("dialog").returnValue), "cancel", "native returnValue is kept");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "opener");
    });

    await t.test("Modal: quick reopen during the exit animation (Strict Mode dev build)", async () => {
      await page.locator("#opener").click();
      await page.getByRole("button", { name: "Zamknij" }).click();
      await page.evaluate(() => window.__reopen());
      await page.waitForTimeout(600);
      assert.equal(await dialogOpen(page), true);
      assert.equal(await page.evaluate(() => document.querySelector("dialog").hasAttribute("data-closing")), false);
      await page.keyboard.press("Escape");
      await waitClosed(page);
    });

    await t.test("Modal: closes without animationend (fallback timer) and under reduced motion", async () => {
      await page.addStyleTag({ content: ".ocv-modal[data-closing]{animation:none!important}" });
      await page.locator("#opener").click();
      await page.keyboard.press("Escape");
      await waitClosed(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator("#opener").click();
      await page.keyboard.press("Escape");
      await waitClosed(page);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#traced"), "::before").opacity), "0", "traced outline does not stay drawn");
      await page.emulateMedia({ reducedMotion: "no-preference" });
    });

    await t.test("Toast: one persistent region per politeness, filled after it exists, repeats identical text", async () => {
      await page.evaluate(() => {
        window.__live = [];
        new MutationObserver((records) => {
          for (const record of records) {
            const region = record.target.nodeType === 1 ? record.target.closest?.("[aria-live],[role=status],[role=alert]") ?? record.target : record.target.parentElement;
            for (const node of record.addedNodes) {
              if (node.nodeType === 1 && node.matches?.(".ocv-live")) window.__live.push(["region", node.getAttribute("role"), node.textContent]);
            }
            if (region?.matches?.(".ocv-live") && record.type !== "attributes") window.__live.push(["text", region.getAttribute("role"), region.textContent]);
          }
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      await page.locator("#toast").click();
      await page.waitForTimeout(400);
      await page.locator("#toast").click();
      await page.waitForTimeout(400);
      await page.locator("#toast-danger").click();
      await page.waitForTimeout(400);
      const live = await page.evaluate(() => window.__live);
      const status = live.filter(([, role]) => role === "status");
      assert.deepEqual(status[0], ["region", "status", ""], "the polite region is mounted empty first");
      assert.equal(status.filter(([kind, , text]) => kind === "text" && text === "Zapisano").length, 2, "identical text is announced again");
      assert.ok(live.some(([kind, role, text]) => kind === "text" && role === "alert" && text === "Nie zapisano"), "errors use the alert region");
      assert.equal(await page.locator(".ocv-live").count(), 2);
      assert.equal(await page.locator(".ocv-toast[role]").count(), 0, "the visible toast is not a second live region");
      assert.equal(await page.locator(".ocv-toast").textContent(), "Nie zapisano");
    });

    await t.test("Field: the error region exists before validation and is not re-announced per keystroke", async () => {
      const input = page.locator("#email");
      const region = page.locator("#email-error");
      assert.equal(await region.getAttribute("aria-live"), "polite");
      assert.equal(await region.textContent(), "");
      assert.equal(await input.getAttribute("aria-describedby"), null);
      await input.fill("jan");
      await input.blur();
      await region.evaluate((el) => {
        window.__fieldMutations = 0;
        new MutationObserver((records) => (window.__fieldMutations += records.length)).observe(el, { childList: true, subtree: true, characterData: true });
      });
      assert.equal(await region.textContent(), "Podaj pełny adres e-mail");
      assert.equal(await input.getAttribute("aria-describedby"), "email-error");
      assert.equal(await input.getAttribute("aria-invalid"), "true");
      await input.pressSequentially("kowalski");
      assert.equal(await page.evaluate(() => window.__fieldMutations), 0, "same message, no new announcement");
      await input.pressSequentially("@example.com");
      assert.equal(await region.textContent(), "");
      assert.equal(await input.getAttribute("aria-invalid"), null);
    });

    await t.test("themes: nested data-app-theme re-resolves tokens; root values unchanged", async () => {
      const read = () =>
        page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          return {
            bg: root.getPropertyValue("--ocv-bg").trim(),
            ink: root.getPropertyValue("--ocv-ink").trim(),
            weight: root.getPropertyValue("--ocv-display-weight").trim(),
            nested: getComputedStyle(document.querySelector("#nested-panel")).backgroundColor,
            paper: null,
          };
        });
      const dark = await read();
      assert.equal(dark.bg, "#070910");
      assert.equal(dark.ink, "#f1f2f6");
      assert.equal(dark.weight, "350");
      assert.equal(dark.nested, "rgb(255, 255, 255)", "a light sub-panel inside a dark page uses light tokens");
      await page.evaluate(() => {
        document.documentElement.dataset.appTheme = "light";
        document.body.dataset.appTheme = "light";
        document.querySelector("#nested").dataset.appTheme = "dark";
      });
      const light = await read();
      assert.equal(light.bg, "#e9ebf1");
      assert.equal(light.weight, "300");
      assert.equal(light.nested, "rgb(20, 24, 39)", "a dark sub-panel inside a light page uses dark tokens");
    });

    assert.deepEqual(errors, []);
    await page.close();

    for (const viewport of [{ width: 320, height: 256 }, { width: 390, height: 844 }]) {
      await t.test(`phone ${viewport.width}x${viewport.height}: modal footer reachable by keyboard and touch; checkbox 44px`, async () => {
        const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
        const phone = await context.newPage();
        await phone.goto(`${BASE}/interactive`);
        await hydrated(phone);
        assert.equal(await phone.evaluate(() => matchMedia("(pointer: coarse)").matches), true);

        const visible = (target, selector) =>
          target.evaluate((sel) => {
            const el = document.querySelector(sel);
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return r.top >= 0 && r.bottom <= innerHeight && (hit === el || el.contains(hit));
          }, selector);

        // Touch first: a finger drag up inside the dialog, as raw touch events.
        await phone.locator("#opener").tap();
        await phone.waitForTimeout(400);
        const client = await context.newCDPSession(phone);
        const dialogBox = await phone.locator(".ocv-modal__box").boundingBox();
        const x = Math.round(dialogBox.x + dialogBox.width / 2);
        const touch = (type, y) => client.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
        const bottom = Math.min(dialogBox.y + dialogBox.height, viewport.height) - 10;
        const top = Math.max(dialogBox.y, 0) + 10;
        for (let pass = 0; pass < 8 && !(await visible(phone, "#confirm")); pass += 1) {
          await touch("touchStart", bottom);
          for (let y = bottom; y >= top; y -= 10) await touch("touchMove", y);
          await touch("touchEnd");
          await phone.waitForTimeout(200);
        }
        assert.equal(await visible(phone, "#confirm"), true, "a touch scroll reaches the footer");

        // Keyboard: Tab reaches the footer action and it is on screen.
        await phone.evaluate(() => (document.querySelector(".ocv-modal__box").scrollTop = 0));
        await phone.locator("dialog h2").focus();
        for (let i = 0; i < 6 && !(await phone.evaluate(() => document.activeElement?.id === "confirm")); i += 1) await phone.keyboard.press("Tab");
        assert.equal(await phone.evaluate(() => document.activeElement?.id), "confirm");
        assert.equal(await visible(phone, "#confirm"), true, "the focused confirm button is on screen");

        // Chromium's emulator swallows the click of the next tap after raw CDP touch drags (the events
        // reach the button, no click is synthesised), so taps are proven on a fresh page.
        const fresh = await context.newPage();
        await fresh.goto(`${BASE}/interactive`);
        await hydrated(fresh);
        const terms = fresh.locator("label.ocv-check");
        const box = await terms.boundingBox();
        assert.ok(box.height >= 44, `checkbox label is ${box.height}px tall`);
        await terms.tap();
        assert.equal(await fresh.locator("#terms").isChecked(), true, "tapping the label toggles the checkbox");
        await fresh.locator("#opener").tap();
        await fresh.locator("#confirm").tap();
        await waitClosed(fresh);
        assert.equal(await fresh.locator("#state").getAttribute("data-return-value"), "confirm");
        await context.close();
      });
    }

    await t.test("desktop: modal keeps its centred, internally scrolling layout", async () => {
      const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await desk.goto(`${BASE}/interactive`);
      await hydrated(desk);
      await desk.locator("#opener").click();
      const layout = await desk.evaluate(() => {
        const box = document.querySelector(".ocv-modal__box");
        const head = document.querySelector(".ocv-modal__head").getBoundingClientRect();
        return { overflow: getComputedStyle(box).overflowY, headTop: head.top, width: box.getBoundingClientRect().width };
      });
      assert.equal(layout.overflow, "visible", "only the body scrolls at typical sizes");
      assert.ok(layout.headTop > 0);
      assert.equal(Math.round(layout.width), 580);
      await desk.close();
    });
  } finally {
    await browser.close();
    // child.kill() leaves next's server process alive on Windows; end the whole tree.
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(next.child.pid), "/T", "/F"]);
    else next.child.kill();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await rm(APP, { recursive: true, force: true }).catch(() => {});
  }
});

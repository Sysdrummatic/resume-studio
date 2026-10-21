// Mobile audit of the public routes: horizontal overflow, tap targets < 44px, body text < 12px.
// Usage: node scripts/qa/mobile-audit.mjs <baseUrl>   (needs a running server; not part of npm run ci)
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const ROUTES = ["/", "/resume", "/docs", "/docs/tutorials/publishing-your-first-cv", "/login?mode=signin", "/privacy", "/terms"];
const WIDTHS = [360, 390, 768];
const THEMES = ["light", "dark"];
const MIN_TARGET = 44;
const MIN_FONT = 12;

function inspectPage({ minTarget, minFont }) {
  const visible = (el) => {
    if (el.closest("[inert]")) return false; // decorative previews are not interactive
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`;
  const targets = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")]
    .filter(visible)
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const isInlineLink = el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li, span");
      return !isInlineLink && (r.height < minTarget || r.width < minTarget);
    })
    .map((el) => `${label(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  const smallText = [...document.querySelectorAll("body *")]
    .filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < minFont)
    .map((el) => `${label(el)} ${getComputedStyle(el).fontSize}`);
  const root = document.documentElement;
  return { overflow: root.scrollWidth - root.clientWidth, targets, smallText };
}

const browser = await chromium.launch();
let failures = 0;
for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: width < 768, hasTouch: true });
    await context.addCookies([{ name: "OpenCiVera-theme", value: theme, url: base }]);
    for (const route of ROUTES) {
      const page = await context.newPage();
      try {
        await page.goto(base + route, { waitUntil: "networkidle", timeout: 30000 });
        const result = await page.evaluate(inspectPage, { minTarget: MIN_TARGET, minFont: MIN_FONT });
        const bad = result.overflow > 0 || result.targets.length || result.smallText.length;
        if (bad) failures += 1;
        console.log(`${bad ? "FAIL" : "ok  "} ${theme} ${width} ${route} overflow=${result.overflow} targets=${result.targets.length} smallText=${result.smallText.length}`);
        for (const line of [...new Set(result.targets)].slice(0, 6)) console.log(`      target ${line}`);
        for (const line of [...new Set(result.smallText)].slice(0, 6)) console.log(`      font   ${line}`);
      } catch (error) {
        failures += 1;
        console.log(`ERR  ${theme} ${width} ${route} ${error.message.split("\n")[0]}`);
      }
      await page.close();
    }
    await context.close();
  }
}
await browser.close();
process.exit(failures ? 1 : 0);

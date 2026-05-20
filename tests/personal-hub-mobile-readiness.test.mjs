import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("personal hub mobile drawer uses the shared 980px breakpoint contract", () => {
  const headerNavigation = read("app/components/app-header-navigation.tsx");
  const headerStyles = read("app/globals.css");
  const userClient = read("app/user/user-client.tsx");
  const userStyles = read("app/user/user.css");

  assert.equal(headerNavigation.includes('const DESKTOP_NAVIGATION_BREAKPOINT_QUERY = "(min-width: 980px)";'), true);
  assert.equal(headerNavigation.includes("window.matchMedia(DESKTOP_NAVIGATION_BREAKPOINT_QUERY)"), true);
  assert.equal(headerStyles.includes("@media (max-width: 979px)"), true);
  assert.equal(userClient.includes('const MOBILE_DRAWER_BREAKPOINT_QUERY = "(min-width: 980px)";'), true);
  assert.equal(userStyles.includes("@media (max-width: 979px)"), true);
  assert.equal(userStyles.includes("@media (min-width: 980px)"), true);
});

test("personal hub mobile drawer applies dialog-style accessibility controls", () => {
  const source = read("app/user/user-client.tsx");

  assert.equal(source.includes('role="dialog"'), true);
  assert.equal(source.includes('aria-modal={isSidebarDrawerOpen ? "true" : undefined}'), true);
  assert.equal(source.includes('contentElement.setAttribute("inert", "");'), true);
  assert.equal(source.includes('contentElement.setAttribute("aria-hidden", "true");'), true);
  assert.equal(source.includes('if (event.key === "Escape")'), true);
  assert.equal(source.includes('if (event.key !== "Tab")'), true);
  assert.equal(source.includes("drawerTriggerElement?.focus();"), true);
  assert.equal(source.includes('aria-label="Close personal hub panel"'), true);
});

test("personal hub mobile drawer geometry and fallback states are mobile-aware", () => {
  const source = read("app/user/user-client.tsx");
  const styles = read("app/user/user.css");

  assert.equal(styles.includes("--personal-hub-drawer-width: min(22rem, calc(100vw - 3.5rem));"), true);
  assert.equal(styles.includes("translateX(calc(var(--personal-hub-drawer-width) - 0.25rem))"), true);
  assert.equal(styles.includes("env(safe-area-inset-left)"), true);
  assert.equal(styles.includes("env(safe-area-inset-top)"), true);
  assert.equal(styles.includes("env(safe-area-inset-bottom)"), true);
  assert.equal(styles.includes("@media (prefers-reduced-motion: reduce)"), true);
  assert.equal(source.includes("isPreviewUnavailable"), true);
  assert.equal(source.includes("Preview unavailable"), true);
  assert.equal(source.includes("Preview mode"), false);
  assert.equal(source.includes('aria-label="Resume preview"'), true);
});

test("personal hub shell consumes portal theme tokens instead of local dark-only utilities", () => {
  const source = read("app/user/user-client.tsx");
  const styles = read("app/user/user.css");

  assert.equal(styles.includes("--personal-hub-surface-fill: var(--portal-card-bg-muted);"), true);
  assert.equal(styles.includes("--personal-hub-panel-glow: radial-gradient(circle at top left, var(--portal-accent-glow), transparent 34%);"), true);
  assert.equal(styles.includes("background: var(--portal-overlay-bg);"), true);
  assert.equal(styles.includes("background: var(--portal-panel-bg);"), true);
  assert.equal(source.includes("bg-black/40"), false);
  assert.equal(source.includes("text-white/80"), false);
  assert.equal(source.includes("text-white/30"), false);
  assert.equal(source.includes("bg-white/5"), false);
  assert.equal(source.includes("border-white/10"), false);
});

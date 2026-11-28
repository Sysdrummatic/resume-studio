import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const layout = read("app/layout.tsx");
const shellStyles = read("app/components/app-shell.css");

test("skip link leads to the focusable main landmark", () => {
  assert.match(layout, /<a className="ocv-skip" href="#main-content">\s*\{appI18n\.dictionary\.common\.skip_to_content\}/);
  assert.equal(layout.includes('<main id="main-content" tabIndex={-1} className="app-shell app-main">'), true);
  assert.ok(layout.indexOf('className="ocv-skip"') < layout.indexOf("<header"), "the skip link is the first focus stop");
  assert.match(shellStyles, /\.ocv-skip:focus \{\s*top: 10px;/);
});

test("app footer shows docs, privacy and terms on every route except the landing page", () => {
  const footer = read("app/components/app-footer.tsx");

  assert.equal(layout.includes("<AppFooter />"), true);
  assert.ok(layout.indexOf("<AppFooter />") > layout.indexOf("</main>"));
  assert.match(footer, /if \(pathname === "\/"\) \{\s*return null;/);
  assert.equal(footer.includes("localized-link"), true);
  for (const href of ['href="/docs"', 'href="/privacy"', 'href="/terms"']) {
    assert.equal(footer.includes(href), true, href);
  }
  assert.equal(footer.includes("aria-label={labels.aria_label}"), true);
  assert.match(shellStyles, /@media print \{\s*\.ocv-skip,\s*\.ocv-footer \{\s*display: none !important;/);
});

test("shell labels exist in both languages", () => {
  for (const locale of ["en", "pl"]) {
    const shell = yaml.load(read(`app/i18n/locales/${locale}/app-shell.yaml`));
    assert.equal(typeof shell.common.skip_to_content, "string", `${locale} skip_to_content`);
    for (const key of ["aria_label", "docs", "privacy", "terms"]) {
      assert.equal(typeof shell.footer[key], "string", `${locale} footer.${key}`);
    }
  }
});

test("route content crossfades with a small rise inside the navigation transition", () => {
  const transition = read("app/components/route-transition.tsx");

  assert.equal(layout.includes("<RouteTransition>{children}</RouteTransition>"), true);
  assert.equal(transition.includes('import { ViewTransition, type ReactNode } from "react";'), true);
  // Layouts persist across navigations: keying by path is what makes enter/exit fire.
  assert.equal(transition.includes('<ViewTransition key={pathname} enter="ocv-route" exit="ocv-route" default="none">'), true);
  assert.match(shellStyles, /::view-transition-old\(\.ocv-route\) \{\s*animation: ocv-route-out var\(--motion-base-exit\) var\(--ease-in\) both;/);
  assert.match(shellStyles, /::view-transition-new\(\.ocv-route\) \{\s*animation: ocv-route-in var\(--motion-base\) var\(--ease-out\) both;/);
  // Reduced motion zeroes these tokens (tokens.css), so the swap is instant.
  assert.match(shellStyles, /transform: translateY\(calc\(var\(--ocv-motion-shift\)/);
  assert.match(shellStyles, /::view-transition \{\s*pointer-events: none;/);
});

test("page frame offers the mockup widths and the dotted floor, hidden on workspaces and CV pages", () => {
  assert.match(shellStyles, /\.ocv-page \{[^}]*width: min\(1152px, 100%\);/);
  assert.match(shellStyles, /\.ocv-page--wide \{\s*width: min\(1400px, 100%\);/);
  assert.match(shellStyles, /\.ocv-page--narrow \{\s*width: min\(860px, 100%\);/);
  assert.match(shellStyles, /\.app-main::before \{[^}]*var\(--ocv-grid\)/);
  assert.match(shellStyles, /\.app-main:has\(\.wide-shell-page\)::before,\s*\.app-main:has\(\.cv-domain-page\)::before \{\s*content: none;/);
  // A stacking context on main would trap page overlays (dialogs) below the sticky header (z-index 1000).
  assert.doesNotMatch(shellStyles, /\.app-main \{[^}]*isolation/);
});

test("reduced motion turns off every view-transition animation, root included", () => {
  assert.match(
    shellStyles,
    /@media \(prefers-reduced-motion: reduce\) \{\s*::view-transition-group\(\*\),\s*::view-transition-old\(\*\),\s*::view-transition-new\(\*\) \{\s*animation: none !important;/
  );
});

test("account menu uses the menu primitive and closes on Escape, returning focus to the avatar", () => {
  const menu = read("app/components/account-menu.tsx");

  assert.match(menu, /import \{[^}]*\bMenu\b[^}]*\bMenuItem\b[^}]*\} from "\.\/design-system\/primitives";/);
  assert.equal(menu.includes('<Menu label={labels.actions_aria} className="ocv-popover__panel">'), true);
  assert.equal(menu.includes('role="menu"'), false, "a plain list of links and buttons, not an ARIA menu without arrow keys");
  assert.match(
    menu,
    /event\.key === "Escape" && menuRef\.current\?\.open\) \{\s*event\.stopPropagation\(\);\s*menuRef\.current\.open = false;\s*menuRef\.current\.querySelector\("summary"\)\?\.focus\(\);/
  );
  assert.equal(menu.includes("onKeyDown={handleMenuKeyDown}"), true);
});

test("account menu keeps its role boundaries", () => {
  const menu = read("app/components/account-menu.tsx");

  assert.equal(menu.includes("{canAccessAdminArea(role) && ("), true);
  assert.match(menu, /\{isAdminRole\(role\) && \(\s*<Link href="\/adminsettings#beta-test-mode"/);
  assert.match(menu, /\{isAdminRole\(role\) \? \(\s*<Link href="\/settings"[\s\S]*?\) : \(\s*<MenuItem disabled>\{labels\.settings\}<\/MenuItem>/);
  // #291: Admin settings is admin-only and sits directly above Settings.
  assert.match(
    menu,
    /\{isAdminRole\(role\) && \(\s*<Link href="\/adminsettings" className="ocv-menu__item">\s*\{labels\.admin_settings\}\s*<\/Link>\s*\)\}\s*\{isAdminRole\(role\) \? \(\s*<Link href="\/settings"/,
  );
});

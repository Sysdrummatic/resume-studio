import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DS = "app/components/design-system";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const tokens = () => stripComments(read(`${DS}/tokens.css`));

function rulesFor(css, className) {
  const own = new RegExp(`\\.${className}(?![\\w-])`);
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => selector.split(",").some((part) => own.test(part.trim()) && !/[:\s>[]/.test(part.trim().replace(`.${className}`, ""))))
    .map(([, , body]) => body)
    .join("\n");
}
const primitives = () => stripComments(read(`${DS}/primitives.css`));

const COLOUR_TOKENS = [
  "bg",
  "raise",
  "line",
  "line-strong",
  "control",
  "ink",
  "ink-2",
  "ink-3",
  "on-ink",
  "indigo",
  "indigo-ink",
  "indigo-wash",
  "teal",
  "teal-ink",
  "teal-wash",
  "amber",
  "amber-wash",
  "danger",
  "danger-wash",
  "focus",
];

function colourValue(name, theme) {
  const match = tokens().match(new RegExp(`--ocv-${name}:\\s*([^;]+);`));
  assert.ok(match, `tokens.css must declare --ocv-${name}`);
  const toggle = theme === "light" ? "L" : "D";
  const value = match[1].match(new RegExp(`var\\(--ocv-${toggle},\\s*(#[0-9a-fA-F]{6})\\)`));
  assert.ok(value, `--ocv-${name} must carry a ${theme} hex value through var(--ocv-${toggle}, …)`);
  return value[1];
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("every colour token carries both a light and a dark value", () => {
  for (const name of COLOUR_TOKENS) {
    colourValue(name, "light");
    colourValue(name, "dark");
  }
});

test("theme follows data-app-theme and falls back to the system preference", () => {
  const css = tokens();
  assert.match(css, /:root\s*\{[^}]*--ocv-L:\s*initial;[^}]*--ocv-D:\s*;/);
  assert.match(css, /(^|\n)\[data-app-theme="dark"\]\s*\{[^}]*--ocv-L:\s*;[^}]*--ocv-D:\s*initial;/);
  assert.match(css, /(^|\n)\[data-app-theme="light"\]\s*\{[^}]*--ocv-L:\s*initial;[^}]*--ocv-D:\s*;/);
  // Tokens are re-declared wherever the theme is set, so a nested sub-panel re-resolves them.
  assert.match(css, /:root,\s*\[data-app-theme\]\s*\{[^}]*--ocv-bg:/);
  assert.match(css, /--ocv-scrim:\s*var\(--ocv-bg\);/);
  assert.match(
    css,
    /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-app-theme\]\)\s*\{[^}]*--ocv-D:\s*initial;/,
  );
});

test("text and state colours meet WCAG 2.1 AA in both themes", () => {
  const pairs = [
    ["ink", "bg"],
    ["ink", "raise"],
    ["ink-2", "bg"],
    ["ink-2", "raise"],
    ["ink-3", "bg"],
    ["ink-3", "raise"],
    ["on-ink", "ink"],
    ["indigo-ink", "bg"],
    ["indigo-ink", "raise"],
    ["indigo-ink", "indigo-wash"],
    ["teal-ink", "bg"],
    ["teal-ink", "raise"],
    ["teal-ink", "teal-wash"],
    ["amber", "amber-wash"],
    ["amber", "raise"],
    ["danger", "raise"],
    ["danger", "danger-wash"],
    ["on-ink", "danger"],
    ["on-ink", "teal-ink"],
  ];
  for (const theme of ["light", "dark"]) {
    for (const [fg, bg] of pairs) {
      const ratio = contrast(colourValue(fg, theme), colourValue(bg, theme));
      assert.ok(ratio >= 4.5, `${theme}: --ocv-${fg} on --ocv-${bg} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
    }
  }
});

test("controls and focus ring meet the 3:1 non-text contrast minimum", () => {
  for (const theme of ["light", "dark"]) {
    for (const [fg, bg] of [
      ["control", "bg"],
      ["control", "raise"],
      ["focus", "bg"],
      ["focus", "raise"],
    ]) {
      const ratio = contrast(colourValue(fg, theme), colourValue(bg, theme));
      assert.ok(ratio >= 3, `${theme}: --ocv-${fg} on --ocv-${bg} is ${ratio.toFixed(2)}:1, needs 3:1`);
    }
  }
});

test("motion tokens match epic #190 and exits are shorter than entrances", () => {
  const css = tokens();
  const ms = (name) => {
    const match = css.match(new RegExp(`--${name}:\\s*(\\d+)ms;`));
    assert.ok(match, `tokens.css must declare --${name} in ms`);
    return Number(match[1]);
  };
  assert.equal(ms("motion-instant"), 100);
  assert.equal(ms("motion-quick"), 160);
  assert.equal(ms("motion-base"), 240);
  assert.equal(ms("motion-slow"), 420);
  assert.ok(ms("motion-base-exit") < ms("motion-base"));
  assert.ok(ms("motion-slow-exit") < ms("motion-slow"));
  assert.match(css, /--ease-out:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);
  assert.match(css, /--ease-in:\s*cubic-bezier\(0\.4,\s*0,\s*1,\s*1\);/);
});

test("reduced motion collapses transitions and animations globally", () => {
  const block = tokens().match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, "tokens.css must contain a prefers-reduced-motion block");
  assert.match(block[1], /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(block[1], /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(block[1], /animation-iteration-count:\s*1\s*!important/);
  assert.match(block[1], /--motion-slow:\s*0ms/);
  assert.match(block[1], /--ocv-motion-shift:\s*0px/);
  assert.match(block[1], /--ocv-motion-scale:\s*1;/);
  assert.doesNotMatch(
    stripComments(read("app/globals.css")),
    /prefers-reduced-motion: reduce\)\s*\{\s*\*,/,
    "the global guard must live only in tokens.css",
  );
});

test("type roles: Fraunces for large headings only, Geist for UI, Geist Mono for values", () => {
  const css = tokens();
  assert.match(css, /--ocv-font-ui:\s*var\(--font-geist-sans\)/);
  assert.match(css, /--ocv-font-mono:\s*var\(--font-geist-mono\)/);
  assert.match(css, /--ocv-font-doc:\s*"Space Grotesk"/);

  const p = primitives();
  for (const role of ["display", "title", "heading"]) {
    assert.match(rulesFor(p, `ocv-${role}`), /var\(--ocv-font-display\)/, `.ocv-${role} must use Fraunces`);
  }
  for (const role of ["subheading", "body", "meta", "label", "value"]) {
    const body = rulesFor(p, `ocv-${role}`);
    assert.ok(body.trim(), `.ocv-${role} must exist`);
    assert.doesNotMatch(body, /--ocv-font-display/, `.ocv-${role} must not use Fraunces`);
  }
  assert.match(rulesFor(p, "ocv-value"), /var\(--ocv-font-mono\)/);
});

test("layout self-hosts Fraunces through next/font/local, so builds work offline", () => {
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(layout, /next\/font\/google/, "a build must not fetch fonts from Google (CLAUDE.md: verify/ci work offline)");
  assert.match(layout, /import localFont from "next\/font\/local";/);
  for (const file of ["Fraunces-Latin.woff2", "Fraunces-LatinExt.woff2", "Fraunces-OFL.txt"]) {
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/fonts", file)), `public/fonts/${file} must be vendored`);
  }
  assert.match(layout, /variable: "--font-fraunces"/);
  assert.match(layout, /variable: "--font-fraunces-ext"/);
  assert.match(layout, /prop: "unicode-range"/);
  assert.equal((layout.match(/preload: false/g) || []).length, 2, "Fraunces is not preloaded until a screen renders it");
  assert.match(layout, /\$\{fraunces\.variable\}/);
  assert.match(layout, /\$\{frauncesExt\.variable\}/);
  assert.match(tokens(), /--ocv-font-display:\s*var\(--font-fraunces\),\s*var\(--font-fraunces-ext\)/);
  assert.match(layout, /import "\.\/components\/design-system\/tokens\.css";/);
  assert.match(layout, /import "\.\/components\/design-system\/primitives\.css";/);
});

test("primitives are exported from the design-system index", () => {
  const index = read(`${DS}/primitives/index.ts`);
  const valueExports = new Set(
    [...index.matchAll(/^export \{([^}]+)\} from/gm)].flatMap(([, names]) => names.split(",").map((n) => n.trim())),
  );
  for (const name of [
    "Button",
    "IconButton",
    "SegmentedControl",
    "Field",
    "TextInput",
    "Select",
    "Textarea",
    "Checkbox",
    "SearchField",
    "StatePill",
    "Panel",
    "Modal",
    "Menu",
    "MenuItem",
    "Toast",
    "EmptyState",
    "Paper",
  ]) {
    assert.ok(valueExports.has(name), `index.ts must export the value ${name}`);
  }
});

test("every interactive primitive has a visible focus state", () => {
  const p = primitives();
  for (const selector of [
    ".ocv-btn",
    ".ocv-icon-btn",
    ".ocv-seg__option",
    ".ocv-input",
    ".ocv-check__box",
    ".ocv-search",
    ".ocv-menu__item",
  ]) {
    const escaped = selector.replace(/[.]/g, "\\.");
    assert.match(p, new RegExp(`${escaped}:(focus-visible|focus-within)`), `${selector} needs a focus style`);
  }
  assert.match(p, /outline:\s*2px solid var\(--ocv-focus\)/);
});

test("touch pointers get 44px targets on the compact controls", () => {
  const block = primitives().match(/@media \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, "primitives.css needs a pointer: coarse block");
  for (const selector of [".ocv-btn--small", ".ocv-seg__option", ".ocv-icon-btn"]) {
    assert.ok(block[1].includes(selector), `${selector} must grow on touch`);
  }
  assert.match(tokens(), /--ocv-hit:\s*44px/);
});

test("state pills cover private, public, ok and changes with their colour meaning", () => {
  const p = primitives();
  assert.match(p, /\.ocv-state\[data-state="private"\]\s*\{[^}]*--ocv-indigo-wash[^}]*--ocv-indigo-ink/);
  assert.match(p, /\.ocv-state\[data-state="public"\],\s*\.ocv-state\[data-state="ok"\]\s*\{[^}]*--ocv-teal-wash[^}]*--ocv-teal-ink/);
  assert.match(p, /\.ocv-state\[data-state="changes"\]\s*\{[^}]*--ocv-amber-wash[^}]*--ocv-amber/);
});

test("the paper CV sheet uses only weights the PDF can render, name at 700", () => {
  const p = primitives();
  const paperRules = [...p.matchAll(/(\.ocv-paper[^{]*)\{([^}]*)\}/g)];
  assert.ok(paperRules.length >= 3);
  for (const [, selector, body] of paperRules) {
    const weight = body.match(/font-weight:\s*(\d{3})/);
    if (weight) assert.ok(["400", "500", "700"].includes(weight[1]), `${selector.trim()} uses ${weight[1]}`);
  }
  assert.match(p, /\.ocv-paper__name\s*\{[^}]*font-weight:\s*700/);
});

test("the traced outline animates a registered angle and only transform/opacity elsewhere", () => {
  const p = read(`${DS}/primitives.css`);
  assert.match(p, /@property --ocv-trace\s*\{[^}]*syntax:\s*"<angle>"/);
  const transitions = [...stripComments(p).matchAll(/transition(?:-property)?:\s*([^;]+);/g)].map((m) => m[1]);
  for (const value of transitions) {
    assert.doesNotMatch(value, /\b(width|height|top|left|margin|padding)\b/, `layout property animated: ${value}`);
  }
});

test("the portal typography rule on disk names Fraunces (rule updated with the code)", () => {
  assert.match(read("app/globals.css").slice(0, 800), /Fraunces/);
  assert.match(read(`${DS}/DESIGN_SYSTEM.md`), /Fraunces/);
  const productTypography = read("PRODUCT.md").split("## Typography")[1].split("\n## ")[0];
  assert.match(productTypography, /Fraunces/);
  assert.match(productTypography, /ADR 0026|0026-livecv/);
  assert.match(read("DESIGN.md"), /ADR 0026/);
});

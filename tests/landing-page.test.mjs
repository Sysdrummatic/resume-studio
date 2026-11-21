import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

const require = createRequire(import.meta.url);

function loadTsx(file, overrides = {}) {
  const cache = new Map();

  function load(modulePath) {
    if (cache.has(modulePath)) return cache.get(modulePath).exports;
    const module = { exports: {} };
    cache.set(modulePath, module);
    const { outputText } = ts.transpileModule(readFileSync(modulePath, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true
      }
    });

    function localRequire(specifier) {
      if (specifier in overrides) return overrides[specifier];
      if (specifier.endsWith(".module.css")) {
        return {
          __esModule: true,
          default: new Proxy({}, { get: (_target, property) => String(property) })
        };
      }
      if (!specifier.startsWith(".")) return require(specifier);
      const target = path.resolve(path.dirname(modulePath), specifier);
      const resolved = [target, `${target}.ts`, `${target}.tsx`].find(existsSync);
      if (!resolved) throw new Error(`Missing test dependency: ${specifier}`);
      return load(resolved);
    }

    new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
    return module.exports;
  }

  return load(path.resolve(file));
}

function renderLanding(locale) {
  const dictionary = readAppDictionary(locale);
  const appI18n = {
    locale,
    locales: [{ code: locale, name: locale, nativeName: locale }],
    dictionary
  };
  const Link = ({ href, children, ...props }) => createElement("a", { href, ...props }, children);
  const stubs = {
    "next/link": { __esModule: true, default: Link },
    "./components/localized-link": { __esModule: true, default: Link },
    "./localized-link": { __esModule: true, default: Link },
    "../localized-link": { __esModule: true, default: Link },
    "./lib/language-alternates": { getLanguageAlternatesMetadata: async () => ({}) },
    "./components/recovery-redirect": { __esModule: true, default: () => null },
    "./i18n/server": { getRequestAppI18n: async () => appI18n }
  };
  const HomePage = loadTsx("app/page.tsx", stubs).default;
  return HomePage().then((page) => renderToStaticMarkup(page));
}

const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

for (const locale of ["pl", "en"]) {
  test(`landing is one story of nine captioned stages (${locale})`, async () => {
    const { hero, story } = readAppDictionary(locale).landing;
    const html = await renderLanding(locale);
    const text = textOf(html);

    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    assert.ok(h1, "one h1 for the start stage");
    assert.equal((html.match(/<h1/g) || []).length, 1);
    for (const part of [hero.title, hero.title_prefix, hero.rotating_words[0], hero.title_suffix]) {
      assert.ok(textOf(h1[1]).includes(part), `h1 carries "${part}"`);
    }
    assert.ok(text.includes(hero.lead));
    assert.ok(text.includes(hero.free_note));

    assert.equal(story.stages.length, 8);
    let previous = html.indexOf("<h1");
    for (const stage of story.stages) {
      const at = html.indexOf(`data-stage="${stage.id}"`);
      assert.ok(at > previous, `${stage.id} follows the previous stage`);
      previous = at;
      assert.ok(text.includes(stage.title), `caption title for ${stage.id} is real text`);
      assert.ok(text.includes(stage.body), `caption body for ${stage.id} is real text`);
    }
    assert.equal((html.match(/<article[^>]*data-stage=/g) || []).length, 9);
  });

  test(`the 3D scene is decorative and the controls are real (${locale})`, async () => {
    const { story, features, faq } = readAppDictionary(locale).landing;
    const html = await renderLanding(locale);

    const scene = html.match(/<div[^>]*data-scene[^>]*>/);
    assert.ok(scene, "scene root rendered");
    assert.match(scene[0], /aria-hidden="true"/);
    assert.ok((html.match(/data-obj="/g) || []).length >= 30, "scene objects are DOM, not a canvas");
    assert.doesNotMatch(html, /<canvas|<iframe|webgl/i);

    const rail = html.match(/<nav[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(rail, "side rail is a navigation landmark");
    assert.equal(rail[1], story.rail_label);
    assert.equal((rail[2].match(/<button/g) || []).length, 9, "one rail button per stage");
    assert.ok(html.includes(story.next));

    assert.equal(features.items.length, 11);
    for (const item of features.items) assert.ok(html.includes(item.title), item.title);
    const buttons = html.match(/<button[^>]*data-feature="\d+"[^>]*>/g) || [];
    assert.equal(buttons.length, 11, "every feature has a real button");
    for (const button of buttons) assert.match(button, /aria-expanded="false"/);

    const dialog = html.match(/<dialog[^>]*id="faq"[^>]*>([\s\S]*?)<\/dialog>/);
    assert.ok(dialog, "FAQ drawer is a dialog with id faq (footer links /#faq)");
    assert.equal((dialog[1].match(/<details/g) || []).length, faq.items.length);
    assert.ok(dialog[1].includes(faq.title));
    for (const item of faq.items) assert.ok(textOf(dialog[1]).includes(item.question));

    assert.equal((html.match(/application\/ld\+json/g) || []).length, 2, "SoftwareApplication + FAQPage");
    assert.doesNotMatch(html, / style="/, "poses are written at runtime, never rendered as inline styles");
  });

  test(`CTAs lead to real routes only (${locale})`, async () => {
    const html = await renderLanding(locale);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    const allowed = new Set(["/login", "/login?mode=signup", "/resume", "/docs", "/privacy", "/terms", "/#faq"]);
    for (const href of hrefs) {
      assert.ok(allowed.has(href) || href.startsWith("mailto:"), `unexpected link ${href}`);
    }
    assert.ok(hrefs.filter((h) => h === "/login?mode=signup").length >= 2, "start and last stage invite sign-up");
    assert.ok(hrefs.includes("/resume"));
  });

  test(`copy keeps epic #190's rules: snapshots, no automatic updates or translation, no stats (${locale})`, () => {
    const { hero, story } = readAppDictionary(locale).landing;
    const copy = [
      hero.title, hero.title_prefix, hero.title_suffix, ...hero.rotating_words, hero.lead, hero.free_note,
      ...hero.description,
      ...story.stages.flatMap((stage) => [stage.label, stage.title, stage.body]),
      ...Object.values(story.scene)
    ].join("\n");
    assert.doesNotMatch(copy, /automatycznie|automatically|zawsze aktualn|always up[- ]to[- ]date|aktualizuje się sam|updates? itself|in real time|w czasie rzeczywistym/i);
    assert.doesNotMatch(copy, /tłumacz|translat/i);
    assert.doesNotMatch(copy, /\d+\s*%|\d[\d\s]*\+|\b\d{3,}\b|\b(users|użytkownik)/i);
    assert.doesNotMatch(copy, /\b(cena|cennik|price|pricing|plan premium|subscription|subskrypcj)/i);
    /* brand-language-and-terminology.md: no "snapshot" in user copy; it is the published state of a LiveCV */
    assert.doesNotMatch(copy, /migawk|snapshot|preset|locale|schema/i);
    const history = story.stages.find((s) => s.id === "history");
    assert.match(history.body, /opublikowany stan LiveCV|published state of (your )?LiveCV/i);
    assert.match(history.body, /ponownie|again/i, "a published LiveCV changes only when republished");
    assert.doesNotMatch(copy, /—/, "no em dashes in landing copy");
  });
}

test("the old landing pieces are gone, not left unused", () => {
  for (const file of [
    "app/components/open-civera-animation.tsx",
    "app/components/open-civera-animation.module.css",
    "app/components/landing-sample-cv.tsx",
    "app/components/landing-features.tsx",
    "app/components/scroll-reveal.tsx",
    "public/animations"
  ]) {
    assert.equal(existsSync(file), false, `${file} removed with the CSS 3D scene (#290)`);
  }
});

test("landing motion animates transform and opacity only, besides the traced-outline signatures", () => {
  const css = readFileSync("app/landing.module.css", "utf8");
  for (const [, value] of css.matchAll(/transition(?:-property)?:\s*([^;]+);/g)) {
    for (const part of value.split(",")) {
      const property = part.trim().split(/\s+/)[0];
      if (property === "none") continue;
      assert.ok(["transform", "opacity"].includes(property), `transition on ${property}`);
    }
  }
  /* individual transform properties count as transform; the traced outlines (browser window, the
     "scroll" ring) are the mockup's signature, drawn like .ocv-traced (DESIGN.md → Motion) */
  const allowed = ["transform", "translate", "rotate", "scale", "opacity", "--lp-trace", "stroke-dashoffset"];
  for (const [, name, body] of css.matchAll(/@keyframes ([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
    for (const [, property] of body.matchAll(/([a-z-]+)\s*:/g)) {
      assert.ok(allowed.includes(property), `${name} animates ${property}`);
    }
    if (body.includes("stroke-dashoffset")) assert.equal(name, "lp-ring");
    if (body.includes("--lp-trace")) assert.match(name, /^lp-trace/);
  }
  assert.match(css, /scroll-snap-type:\s*y proximity/);
  assert.match(css, /animation-play-state:\s*paused/, "CSS loops idle with the scene");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(scripting: none\)/, "without JavaScript every caption stays readable");
});

test("reduced motion keeps a crossfade: the global guard spares [data-crossfade] opacity", () => {
  const tokens = readFileSync("app/components/design-system/tokens.css", "utf8");
  const guard = tokens.slice(tokens.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(guard, /:not\(\[data-crossfade\]\)/);
  assert.match(guard, /\[data-crossfade\]\s*\{[^}]*transition-property:\s*opacity\s*!important/);
});

test("the frame loop: scroll picks the stage, the loop sleeps when settled, off screen and on hidden tabs", () => {
  const story = readFileSync("app/components/landing/landing-story.tsx", "utf8");
  assert.match(story, /targetFor\(/, "scroll picks the stage (stage-based, not scrubbed)");
  assert.match(story, /follow\(clock\.progress, target, dt\)/, "the timeline follows the stage over ~600ms");
  assert.match(story, /addEventListener\("scroll", wake, \{ passive: true \}\)/);
  assert.match(story, /if \(restless\(\) \|\| skipping\) frame = window\.requestAnimationFrame\(tick\);\s*else running = false;/, "the loop sleeps once settled");
  assert.match(story, /IntersectionObserver/);
  assert.match(story, /visibilitychange/);
  assert.match(story, /prefers-reduced-motion: reduce/);
  assert.match(story, /stillFrame/, "reduced motion: one still frame per stage and a crossfade");
  assert.doesNotMatch(story, /setInterval/);
  const allowedWrites = ["transform", "opacity", "pointerEvents", "perspective", "top", "height", "translate", "animationDuration", "animationDelay"];
  for (const written of story.matchAll(/style\.(\w+) = /g)) {
    assert.ok(allowedWrites.includes(written[1]), `writes style.${written[1]}`);
  }
  const sheets = readFileSync("app/components/landing/floating-sheets.tsx", "utf8");
  assert.match(sheets, /visibilitychange/);
  assert.match(sheets, /aria-hidden="true"/);
  assert.match(sheets, /if \(!reduced\.matches\) frame = window\.requestAnimationFrame\(tick\);/, "reduced motion: one still frame");
});

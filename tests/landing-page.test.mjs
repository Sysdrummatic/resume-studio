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
    for (const part of [...hero.title, hero.title_prefix, hero.rotating_words[0], hero.title_suffix]) {
      assert.ok(textOf(h1[1]).includes(part), `h1 carries "${part}"`);
    }
    /* crawlers read the server HTML: the h1 is one sentence, not every rotating word at once */
    assert.equal(textOf(h1[1]).trim(), `${hero.title.join(" ")} ${hero.title_prefix} ${hero.rotating_words[0]} ${hero.title_suffix}`);
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
      ...hero.title, hero.title_prefix, hero.title_suffix, ...hero.rotating_words, hero.lead, hero.free_note,
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
  /* one gesture moves exactly one stage and the page rests on it (CSS scroll snap, no wheel hijacking) */
  assert.match(css, /scroll-snap-type:\s*y mandatory/);
  assert.match(css, /\.slot \{[^}]*scroll-snap-align: start;[^}]*scroll-snap-stop: always;/);
  assert.match(css, /\.footer \{[^}]*scroll-snap-align: end;/, "the footer stays reachable");
  assert.doesNotMatch(readFileSync("app/components/landing/landing-story.tsx", "utf8"), /addEventListener\("wheel"/, "no wheel hijacking");
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
  assert.doesNotMatch(story, /targetFor|skipping|const step =/, "no lean, no fade-and-jump, no rounded style writes");
  assert.match(story, /clock\.progress = follow\(clock\.progress, target, dt, FOLLOW \* paceAt\(clock\.progress, target\)\);/, "the timeline follows the scroll as in the mockup");
  assert.match(story, /addEventListener\("scroll", wake, \{ passive: true \}\)/);
  assert.match(story, /if \(restless\(\)\) frame = window\.requestAnimationFrame\(tick\);\s*else running = false;/, "the loop sleeps once settled");
  assert.match(story, /IntersectionObserver/);
  assert.match(story, /visibilitychange/);
  assert.match(story, /prefers-reduced-motion: reduce/);
  assert.match(story, /stillFrame/, "reduced motion: one still frame per stage and a crossfade");
  assert.doesNotMatch(story, /setInterval/);
  /* DESIGN.md → Motion: in a hero only the decorative scene may animate, never the copy or the CTAs */
  assert.match(story, /const opacity = clamp\(1 - distanceFrom\(clock\.progress, index\) \* 2\.3\);/, "captions follow the timeline only");
  assert.doesNotMatch(story, /const settled =|index === 0 \?/, "the start caption never waits for the opening vortex");
  const faces = readFileSync("app/components/landing/scene-faces.tsx", "utf8");
  assert.match(faces, /solid \? FACES : FACES\.slice\(0, 1\)/, "thin boxes keep one face (layer memory)");
  const allowedWrites = ["transform", "opacity", "pointerEvents", "perspective", "top", "height", "translate", "animationDuration", "animationDelay"];
  for (const written of story.matchAll(/style\.(\w+) = /g)) {
    assert.ok(allowedWrites.includes(written[1]), `writes style.${written[1]}`);
  }
  const sheets = readFileSync("app/components/landing/floating-sheets.tsx", "utf8");
  assert.match(sheets, /visibilitychange/);
  assert.match(sheets, /aria-hidden="true"/);
  assert.match(sheets, /if \(!reduced\.matches\) frame = window\.requestAnimationFrame\(tick\);/, "reduced motion: one still frame");
});

test("the simplified version: only the stage headings, centred in height, on a short computer window", () => {
  const story = readFileSync("app/components/landing/landing-story.tsx", "utf8");
  const screen = readFileSync("app/components/landing/short-window-screen.tsx", "utf8");
  const css = readFileSync("app/landing.module.css", "utf8");
  assert.match(screen, /onSimplify\(\)/, "choosing the simplified version is reported to the story");
  assert.match(story, /<ShortWindowScreen copy=\{story\.short_screen\} name=\{cv\.name\} onSimplify=\{\(\) => setSimple\(true\)\} \/>/);
  assert.match(story, /data-simple=\{simple \|\| undefined\}/);
  /* only inside the short computer window: a taller window or a phone keeps its layout */
  assert.match(css, /@media \(max-height: 560px\) and \(pointer: fine\) \{\s*\.stage\[data-simple\] \.caption \{\s*top: 0;\s*bottom: 0;\s*align-content: center;/);
  assert.match(css, /\.stage\[data-simple\] \.caption > :not\(\.title\) \{\s*display: none;/);
});

test("a short window gets the side layout on any device; only a computer is told to enlarge it", () => {
  const story = readFileSync("app/components/landing/landing-story.tsx", "utf8");
  const css = readFileSync("app/landing.module.css", "utf8");
  /* the scene and the CSS read one condition: any landscape window up to 560px tall */
  assert.match(story, /if \(window\.innerHeight <= 560 && width >= height\) return "side";/);
  assert.doesNotMatch(css, /max-height: \d+px\) and \(pointer: coarse\)/, "the side layout is not touch-only");
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 560px\) \{/);
  /* a computer can enlarge its window, so it gets a full screen asking for that; a phone in landscape already has its own layout */
  const screen = readFileSync("app/components/landing/short-window-screen.tsx", "utf8");
  assert.match(story, /<ShortWindowScreen copy=\{story\.short_screen\}/);
  assert.match(screen, /const SHORT_SCREEN_QUERY = "\(max-height: 560px\) and \(pointer: fine\)";/);
  assert.match(screen, /<dialog\b[^>]*className=\{styles\.shortScreen\}[^>]*aria-labelledby=/s);
  assert.match(screen, /\.showModal\(\)/, "a modal dialog: the page behind is inert, Esc closes it");
  assert.match(css, /\.shortScreen::backdrop/);
  assert.doesNotMatch(css, /shortNotice/, "the small notice is gone");
  for (const locale of ["pl", "en"]) {
    const { landing } = readAppDictionary(locale);
    const copy = landing.story.short_screen;
    assert.ok(copy.title && copy.text && copy.action, `${locale}: screen copy`);
    assert.doesNotMatch(Object.values(copy).join(" "), /—/, `${locale}: no em dash`);
  }
});

test("landing polish (#290 review): copy, hero lines, browser window, chips, link, phone carousel", () => {
  const story = readFileSync("app/components/landing/landing-story.tsx", "utf8");
  const css = readFileSync("app/landing.module.css", "utf8");
  const pl = readAppDictionary("pl").landing;
  const en = readAppDictionary("en").landing;
  /* 1. the short-window screen */
  assert.equal(pl.story.short_screen.text, "Treść strony jest zaprojektowana dla okien o wysokości większej niż 560 px. Powiększ okno, aby otworzyć pełnowartościową animację.");
  /* 3. the hero in four lines: two from the title list, the rotating word's line, the suffix */
  for (const locale of ["pl", "en"]) assert.equal(readAppDictionary(locale).landing.hero.title.length, 2, locale + ": two title lines");
  assert.deepEqual(pl.hero.title, ["Stwórz swoje", "idealne LiveCV,"]);
  assert.match(story, /hero\.title\.map\(/);
  assert.match(story, /<span>\{hero\.title_suffix\}<\/span>/);
  assert.match(css, /:global\(\.lp-rot__word\) \{[^}]*position: absolute;/);
  assert.match(css, /:global\(\.lp-rot__word\.is-active\) \{[^}]*position: relative;/);
  /* 4. the LiveCV stage: the browser window is drawn round the CV's outline from a corner and taken off the same way */
  assert.match(css, /\.box\[data-trace="cycle"\] > \.face \{[^}]*mask: conic-gradient\([^;]*var\(--lp-trace\)[^}]*animation: lp-trace-frame/);
  assert.match(css, /@keyframes lp-trace-frame \{[\s\S]*?--lp-trace: 720deg/);
  assert.doesNotMatch(css, /lp-frame-cycle/, "the window no longer flies in from behind the CV");
  /* browser windows have rounded corners */
  assert.match(css, /\.box\[data-kind="frame"\] :is\(\.face, \.layerPaper\) \{[^}]*border-radius:/);
  assert.doesNotMatch(css, /\.box\[data-trace="cycle"\] \.trace \{[^}]*animation: lp-trace-cycle/);
  assert.equal(pl.story.scene.picked.many, "Wybrano {count} elementów doświadczenia");
  assert.equal(pl.story.scene.picked.few, "Wybrano {count} elementy doświadczenia");
  assert.ok(en.story.scene.picked.other.includes("{count}"));
  assert.equal(pl.story.scene.picked_note, undefined);
  assert.match(story, /new Intl\.PluralRules\(/);
  /* 5. rounded chips (the free one was dropped again) and a real link from content/landing.yaml */
  assert.match(css, /\.box\[data-kind="format"\] :is\(\.face, \.layerPaper\) \{[^}]*border-radius:/);
  assert.equal(pl.story.scene.free, undefined);
  assert.doesNotMatch(css, /format-3/);
  assert.match(story, /<a\b[^>]*href=\{sampleLink\.url\}/s);
  const home = readFileSync("app/page.tsx", "utf8");
  assert.match(home, /loadLandingConfig\(\)/);
  assert.match(readFileSync("next.config.ts", "utf8"), /"\.\/content\/landing\.yaml"/);
  /* 6. phones: the feature cards drift slowly and a finger can take over */
  assert.match(story, /scrollLeft/);
  assert.match(story, /"pointerdown"/);
  assert.match(css, /\.featureList\[data-drift\] \{[^}]*scroll-snap-type: none;/);
});

test("LiveCV?: the browser window waits until the CV has come to rest, then a second more", () => {
  const story = readFileSync("app/components/landing/landing-story.tsx", "utf8");
  const css = readFileSync("app/landing.module.css", "utf8");
  assert.match(story, /nextTrace === "cycle" && Math\.abs\(clock\.progress - AT\.livecv\) > SETTLED\) nextTrace = "wait";/);
  assert.match(css, /\.box\[data-trace="wait"\] > \.face \{[^}]*opacity: 0;/);
  assert.match(css, /\.box\[data-trace="cycle"\] > \.face \{[^}]*animation: lp-trace-frame 5\.6s [^;]* 1s infinite backwards;/);
});

test("review fixes: Esc on the short-window screen opens the simplified version too; the carousel loop runs on phones only", () => {
  const screen = readFileSync("app/components/landing/short-window-screen.tsx", "utf8");
  const story = readFileSync("app/components/landing/landing-story.tsx", "utf8");
  assert.match(screen, /const dismiss = \(\) => \{\s*dismissed\.current = true;\s*simplify\.current\(\);/);
  assert.match(story, /if \(!phone\.matches\) return;/);
});

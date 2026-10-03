import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import yaml from "js-yaml";

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
  const dictionary = yaml.load(readFileSync(`app/i18n/locales/${locale}.yaml`, "utf8"));
  const appI18n = {
    locale,
    locales: [{ code: locale, name: locale, nativeName: locale }],
    dictionary
  };
  const Link = ({ href, children, ...props }) => createElement("a", { href, ...props }, children);
  const icon = ({ children }) => createElement("svg", { "aria-hidden": "true" }, children);
  const stubs = {
    "next/link": { __esModule: true, default: Link },
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "lucide-react": new Proxy({}, { get: () => icon }),
    "./components/footer": {
      __esModule: true,
      default: () => createElement("footer", { "data-testid": "landing-footer" })
    },
    "./components/landing-sample-cv": {
      __esModule: true,
      default: () => createElement("div", { "data-testid": "landing-sample-cv" })
    },
    "./components/open-civera-animation": {
      __esModule: true,
      default: () => createElement("div", { "data-testid": "open-civera-animation" })
    },
    "./components/recovery-redirect": { __esModule: true, default: () => null },
    "./components/scroll-reveal": { __esModule: true, default: () => null },
    "./i18n/server": { getRequestAppI18n: async () => appI18n }
  };
  const HomePage = loadTsx("app/page.tsx", stubs).default;
  return HomePage().then((page) => renderToStaticMarkup(page));
}

for (const locale of ["pl", "en"]) {
  test(`landing restores master sections with the current CV, animation, features and FAQ (${locale})`, async () => {
    const dictionary = yaml.load(readFileSync(`app/i18n/locales/${locale}.yaml`, "utf8")).landing;
    const html = await renderLanding(locale);
    const sections = [
      "lp-hero-title",
      "lp-resume-title",
      "story-animation",
      "lp-model-title",
      "faq",
      "lp-cta-title"
    ];
    let previous = -1;
    for (const id of sections) {
      const position = html.indexOf(`id="${id}"`);
      assert.ok(position > previous, `${id} stays in the requested order`);
      previous = position;
    }
    assert.match(html, /data-testid="landing-sample-cv"/);
    assert.match(html, /data-testid="open-civera-animation"/);
    assert.ok(html.includes(dictionary.hero.title));
    assert.ok(html.includes(dictionary.sample.title));
    assert.ok(html.includes(dictionary.sample.description));
    assert.ok(html.includes(dictionary.sample.open_action));
    assert.ok(html.includes(dictionary.cta.title));
    assert.ok(html.includes(dictionary.cta.description));
    assert.ok(html.includes(dictionary.cta.secondary_action));
    assert.ok(html.includes(dictionary.features.aria_label));
    assert.equal(dictionary.features.items.length, 8);
    for (const item of dictionary.features.items) assert.ok(html.includes(item.title));
    const duplicate = html.match(
      /<ul class="carouselGroup carouselDuplicate" aria-hidden="true">([\s\S]*?)<\/ul>/
    );
    assert.ok(duplicate, "the repeated visual group is hidden from assistive technology");
    assert.doesNotMatch(duplicate[1], /tabindex="0"/);
    assert.equal((html.match(/tabindex="0"/g) || []).length, dictionary.features.items.length);
    assert.ok(html.includes('aria-pressed="false"'));
    assert.equal((html.match(/<details/g) || []).length, dictionary.faq.items.length);
    assert.doesNotMatch(html, /id="experience-base-title"|id="vision-title"|id="how"/);
    assert.ok(html.indexOf('data-testid="landing-footer"') > previous);
  });
}
test("animation stays an isolated, lazy component with locale and theme inputs", () => {
  const componentPath = "app/components/open-civera-animation.tsx";
  const animationPath = "public/animations/opencivera-animation.html";

  assert.equal(existsSync(componentPath), true, "the landing owns a reusable animation component");
  assert.equal(existsSync(animationPath), true, "the animation remains independently replaceable");

  const Animation = loadTsx(componentPath).default;
  const html = renderToStaticMarkup(
    createElement(Animation, {
      locale: "pl",
      initialTheme: "light",
      title: "Jak działa OpenCiVera"
    })
  );

  assert.match(
    html,
    /src="\/animations\/opencivera-animation\.html\?embedded=1&amp;lang=pl&amp;theme=light"/
  );
  assert.match(html, /title="Jak działa OpenCiVera"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /sandbox="allow-scripts"/);
  assert.doesNotMatch(html, /allow-same-origin/);

  const animationSource = readFileSync("public/animations/opencivera-animation.js", "utf8");
  assert.match(animationSource, /Zatrzymaj animację/);
  assert.match(animationSource, /Postęp animacji/);
  assert.match(animationSource, /Doświadczenia przybywa z czasem/);
});

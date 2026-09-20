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
    "./components/rotating-word": {
      __esModule: true,
      default: ({ words }) => createElement("span", null, words[0])
    },
    "./components/scroll-reveal": { __esModule: true, default: () => null },
    "./i18n/server": { getRequestAppI18n: async () => appI18n }
  };
  const HomePage = loadTsx("app/page.tsx", stubs).default;
  return HomePage().then((page) => renderToStaticMarkup(page));
}

test("landing follows the Twoja historia narrative and keeps product sections in order", async () => {
  const html = await renderLanding("pl");
  const sampleIndex = html.indexOf('data-testid="landing-sample-cv"');
  const animationIndex = html.indexOf('id="story-animation"');
  const howIndex = html.indexOf('id="how"');
  const privacyIndex = html.indexOf('id="privacy"');
  const faqIndex = html.indexOf('id="faq"');
  const footerIndex = html.indexOf('data-testid="landing-footer"');

  assert.match(html, /Twoje doświadczenie/);
  assert.ok(sampleIndex > -1, "the current sample CV is visible in the hero");
  assert.ok(animationIndex > sampleIndex, "the animation follows the sample CV");
  assert.ok(howIndex > animationIndex, "the product explanation follows the animation");
  assert.ok(privacyIndex > howIndex, "privacy follows the product explanation");
  assert.ok(faqIndex > privacyIndex, "FAQ follows privacy");
  assert.ok(footerIndex > faqIndex, "the unchanged footer stays last");
});

test("landing renders the same complete narrative from the English dictionary", async () => {
  const html = await renderLanding("en");

  assert.match(html, /Your experience/);
  assert.match(html, /Less time managing files/);
  assert.match(html, /Good to know/);
  assert.match(html, /data-testid="open-civera-animation"/);
});

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

  const animationSource = readFileSync(animationPath, "utf8");
  assert.match(animationSource, /Zatrzymaj animację/);
  assert.match(animationSource, /Postęp animacji/);
  assert.match(animationSource, /Zbieranie historii/);
});

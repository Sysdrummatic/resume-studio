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

test("landing explains the Experience Base model and keeps product sections in order", async () => {
  const html = await renderLanding("pl");
  const sampleIndex = html.indexOf('data-testid="landing-sample-cv"');
  const animationIndex = html.indexOf('id="story-animation"');
  const experienceBaseIndex = html.indexOf('id="experience-base-title"');
  const howIndex = html.indexOf('id="how"');
  const structuredDataIndex = html.indexOf('id="structured-data-title"');
  const privacyIndex = html.indexOf('id="privacy"');
  const visionIndex = html.indexOf('id="vision-title"');
  const faqIndex = html.indexOf('id="faq"');
  const footerIndex = html.indexOf('data-testid="landing-footer"');

  assert.match(html, /Jedna Baza doświadczeń/);
  assert.match(html, /Kreator CV zbudowany inaczej/);
  assert.match(html, /Utwórz swoje pierwsze CV/);
  assert.match(html, /Jak to działa w praktyce/);
  assert.match(html, /05[\s\S]*Zaktualizuj Bazę doświadczeń/);
  assert.match(html, /Koniec z wieloma plikami CV zapisanymi na dysku/);
  assert.match(html, /CV jako uporządkowane dane/);
  assert.match(html, /CV to dopiero początek/);
  assert.match(html, /Czy muszę znać YAML/);
  assert.doesNotMatch(html, /Aktualizujesz doświadczenie w jednym miejscu/);
  assert.ok(sampleIndex > -1, "the current sample CV is visible in the hero");
  assert.ok(animationIndex > sampleIndex, "the animation follows the sample CV");
  assert.ok(experienceBaseIndex > animationIndex, "the Experience Base explanation follows the animation");
  assert.ok(howIndex > experienceBaseIndex, "the process follows the Experience Base explanation");
  assert.ok(structuredDataIndex > howIndex, "CV-as-Code follows the current product workflow");
  assert.ok(privacyIndex > structuredDataIndex, "privacy follows the data model explanation");
  assert.ok(visionIndex > privacyIndex, "the future vision follows current product capabilities");
  assert.ok(faqIndex > visionIndex, "FAQ follows the product vision");
  assert.ok(footerIndex > faqIndex, "the unchanged footer stays last");
});

test("landing renders the same complete narrative from the English dictionary", async () => {
  const html = await renderLanding("en");

  assert.match(html, /One Experience Base/);
  assert.match(html, /A CV builder designed differently/);
  assert.match(html, /Create your first CV/);
  assert.match(html, /How does it work in practice/);
  assert.match(html, /Stop leaving multiple CV files on your computer/);
  assert.match(html, /Your CV as structured data/);
  assert.match(html, /A CV is only the beginning/);
  assert.match(html, /Do not start from scratch/);
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

  const animationSource = readFileSync("public/animations/opencivera-animation.js", "utf8");
  assert.match(animationSource, /Zatrzymaj animację/);
  assert.match(animationSource, /Postęp animacji/);
  assert.match(animationSource, /Doświadczenia przybywa z czasem/);
});

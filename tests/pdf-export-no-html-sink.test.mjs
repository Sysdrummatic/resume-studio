import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx", "/index.js"];

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function resolveImport(from, specifier) {
  const base = specifier.startsWith("@/") ? resolve(root, specifier.slice(2)) : resolve(dirname(from), specifier);
  return EXTENSIONS.map((ext) => base + ext).find(isFile);
}

// Follows local imports from the entry points, so a sink in any helper the PDF path pulls in is scanned, whatever its extension or directory.
function collectSources(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(/(?:from|import)\s*\(?\s*["']((?:\.{1,2}\/|@\/)[^"']*)["']/g)) {
      const target = resolveImport(file, specifier);
      if (target) queue.push(target);
    }
  }
  return [...seen];
}

const pdfSources = collectSources([
  ...readdirSync(resolve(root, "app/lib/pdf"), { recursive: true })
    .map((entry) => resolve(root, "app/lib/pdf", entry))
    .filter(isFile),
  resolve(root, "app/api/resume/export/pdf/route.ts"),
  resolve(root, "app/api/resume/export/pdf/preview/route.ts"),
]);

const FORBIDDEN_SINKS = [
  { name: "raw HTML injection", pattern: /dangerouslySetInnerHTML|innerHTML/ },
  { name: "headless browser rendering", pattern: /puppeteer|playwright|chromium/i },
  { name: "HTML string rendering", pattern: /renderToStaticMarkup|renderToString/ },
  { name: "PDF hyperlink annotations", pattern: /import[^;]*\bLink\b[^;]*from\s*["']@react-pdf\/renderer["']/ },
];

test("scanner follows imports outside app/lib/pdf", () => {
  const scanned = pdfSources.map((file) => relative(root, file).replaceAll("\\", "/"));
  assert.ok(scanned.includes("app/lib/resume-schema.ts"));
  assert.ok(scanned.includes("app/components/resume-renderer/build-resume-render-model.ts"));
});

test("PDF export sources contain no HTML or browser rendering sink", () => {
  const violations = [];
  for (const file of pdfSources) {
    const source = readFileSync(file, "utf8");
    for (const sink of FORBIDDEN_SINKS) {
      if (sink.pattern.test(source)) {
        violations.push(`${relative(root, file)}: ${sink.name}`);
      }
    }
  }
  assert.deepEqual(violations, [], "PDF text is rendered by @react-pdf primitives only; reintroducing HTML or links needs an escaping review");
});

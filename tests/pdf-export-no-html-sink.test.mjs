import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const pdfSources = [
  ...sourceFiles(resolve(root, "app/lib/pdf")),
  resolve(root, "app/api/resume/export/pdf/route.ts"),
  resolve(root, "app/api/resume/export/pdf/preview/route.ts"),
];

const FORBIDDEN_SINKS = [
  { name: "raw HTML injection", pattern: /dangerouslySetInnerHTML|innerHTML/ },
  { name: "headless browser rendering", pattern: /puppeteer|playwright|chromium/i },
  { name: "HTML string rendering", pattern: /renderToStaticMarkup|renderToString/ },
  { name: "PDF hyperlink annotations", pattern: /<Link\b/ },
];

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

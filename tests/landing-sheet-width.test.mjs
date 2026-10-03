import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The landing hero renders the published CV as a scaled preview of /resume, so
 * it must be laid out at the sample CV's own shell width, not the 210mm sheet
 * the renderer's plain variant defaults to.
 *
 * `--resume-max-width` is scoped to the CV root, which is a descendant of the
 * landing page element, so the landing module cannot read it through the
 * cascade and mirrors the literal instead. That mirror is what this guards.
 *
 * The value is derived from PX_TO_PT (see the comment above --resume-max-width
 * in resume.css) — if it changes, it changes there first, and this test points
 * at the copy that has to follow.
 */
function readToken(file, token) {
  const source = readFileSync(file, "utf8");
  const match = source.match(new RegExp(`${token}:\\s*([0-9.]+)px`));
  assert.ok(match, `${token} not found in ${file}`);
  return Number(match[1]);
}

test("the landing CV preview is laid out at the sample CV's shell width", () => {
  const cvWidth = readToken("app/resume/resume.css", "--resume-max-width");
  const landingWidth = readToken("app/landing.module.css", "--story-sheet-width");

  assert.equal(
    landingWidth,
    cvWidth,
    "--story-sheet-width (app/landing.module.css) mirrors --resume-max-width " +
      "(app/resume/resume.css). Update the landing copy to match, and never round it."
  );
});

test("the preview pins the CV's shell width instead of letting it resolve", () => {
  const landing = readFileSync("app/landing.module.css", "utf8");
  const globals = readFileSync("app/globals.css", "utf8");

  assert.match(
    landing,
    /\.sheet :global\(\.resume-view-page\)\s*\{[^}]*--resume-shell-width:\s*var\(--story-sheet-width\)/,
    "--resume-shell-width resolves through viewport media queries, so the preview pins it"
  );
  assert.doesNotMatch(
    globals,
    /\.lp-cv \{[^}]*width:/,
    "the sheet's width belongs to the landing module, which owns the preview scale"
  );
});

test("the preview scale is measured, not a table of per-breakpoint steps", () => {
  const landing = readFileSync("app/landing.module.css", "utf8");
  const component = readFileSync("app/components/landing-sample-cv.tsx", "utf8");

  assert.match(
    landing,
    /zoom:\s*var\(--sheet-scale/,
    "the sheet's scale comes from the measured custom property"
  );
  assert.equal(
    (landing.match(/zoom:\s*[0-9.]/g) || []).length,
    0,
    "fixed zoom values are per-breakpoint steps again; the fit has to stay continuous"
  );
  assert.doesNotMatch(
    component,
    /901\.7/,
    "the reference width is read from --story-sheet-width, never copied into JS"
  );
});

test("the preview renders the sample CV, not the renderer's plain paper variant", () => {
  const component = readFileSync("app/components/landing-sample-cv.tsx", "utf8");
  const call = component.match(/<ResumeViewClient[\s\S]*?\/>/);
  assert.ok(call, "the preview renders ResumeViewClient");

  assert.doesNotMatch(
    call[0],
    /showChrome=\{false\}/,
    "showChrome={false} switches the renderer to 210mm paper with no card shadows, " +
      "which is exactly what made the preview look unlike /resume"
  );
  assert.match(call[0], /\bembedded\b/, "the CV root otherwise breaks out to 100vw");
});

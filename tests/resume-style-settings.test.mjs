import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_RESUME_STYLE,
  DENSITY_SCALE,
  TEXT_SIZE_SCALE,
  applyResumeStyleToTheme,
  normalizeResumeStyle,
  resumeStyleDataAttributes,
} from "../app/lib/resume-style.ts";
import { cvBasicDotTheme } from "../app/lib/pdf/theme.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("defaults reproduce the unstyled CV, hiding nothing the renderer draws", () => {
  // A document that has never been styled must render exactly as before, so no
  // default may switch an element off.
  assert.equal(DEFAULT_RESUME_STYLE.sectionDividers, true);
  assert.equal(DEFAULT_RESUME_STYLE.headerPhoto, true);
  assert.equal(DEFAULT_RESUME_STYLE.liveLinkQr, true);
  assert.equal(TEXT_SIZE_SCALE[DEFAULT_RESUME_STYLE.textSize], 1);
  assert.equal(DENSITY_SCALE[DEFAULT_RESUME_STYLE.density], 1);
});

test("normalizeResumeStyle never returns an unusable object", () => {
  assert.deepEqual(normalizeResumeStyle(null), DEFAULT_RESUME_STYLE);
  assert.deepEqual(normalizeResumeStyle("nonsense"), DEFAULT_RESUME_STYLE);
  assert.deepEqual(normalizeResumeStyle([]), DEFAULT_RESUME_STYLE);
  assert.equal(normalizeResumeStyle({ textSize: "enormous" }).textSize, "medium");
  assert.equal(normalizeResumeStyle({ density: 7 }).density, "normal");
  assert.equal(normalizeResumeStyle({ sectionDividers: "yes" }).sectionDividers, true);
  assert.equal(normalizeResumeStyle({ textSize: "large", liveLinkQr: false }).textSize, "large");
  assert.equal(normalizeResumeStyle({ liveLinkQr: false }).liveLinkQr, false);
});

test("data attributes drive the CSS variants", () => {
  const attrs = resumeStyleDataAttributes({ ...DEFAULT_RESUME_STYLE, textSize: "large", liveLinkQr: false });
  assert.equal(attrs["data-cv-text-size"], "large");
  assert.equal(attrs["data-cv-live-qr"], "off");
  assert.equal(attrs["data-cv-dividers"], "on");
});

test("web variants scale from *-base aliases, never from a restated literal", () => {
  const css = read("app/resume/resume.css");
  const variants = css.slice(css.indexOf("── CV STYLE VARIANTS"));

  // Self-reference (`--x: calc(var(--x) * k)`) is a cycle even on a descendant
  // and computes to guaranteed-invalid, which silently drops the token.
  assert.equal(/--font-size-md:\s*calc\(var\(--font-size-md\)/.test(variants), false);
  assert.match(variants, /--font-size-md:\s*calc\(var\(--font-size-md-base\) \* 1\.1\)/);
  assert.match(variants, /--space-md:\s*calc\(var\(--space-md-base\) \* 1\.18\)/);
  assert.match(variants, /--space-md:\s*calc\(var\(--space-md-base\) \* 0\.82\)/);

  // The aliases must be declared after the parity boundary so the canonical
  // block stays the only thing pdf-web-style-parity reads.
  assert.equal(css.indexOf("--font-size-md-base:") > css.indexOf(".resume-editor-basic {"), true);
});

test("web and PDF scale by the identical factors", () => {
  const css = read("app/resume/resume.css");
  const variants = css.slice(css.indexOf("── CV STYLE VARIANTS"));

  for (const [size, factor] of Object.entries(TEXT_SIZE_SCALE)) {
    if (factor === 1) continue;
    assert.equal(
      variants.includes(`[data-cv-text-size="${size}"]`),
      true,
      `resume.css must implement the ${size} text variant`,
    );
    assert.equal(variants.includes(`* ${factor})`), true, `${size} must scale by ${factor} in CSS as well as the PDF`);
  }

  for (const [density, factor] of Object.entries(DENSITY_SCALE)) {
    if (factor === 1) continue;
    assert.equal(variants.includes(`[data-cv-density="${density}"]`), true);
    assert.equal(variants.includes(`* ${factor})`), true);
  }
});

test("applyResumeStyleToTheme multiplies type and spacing, and leaves the page margin alone", () => {
  const scaled = applyResumeStyleToTheme(cvBasicDotTheme, {
    ...DEFAULT_RESUME_STYLE,
    textSize: "large",
    density: "relaxed",
  });

  assert.equal(scaled.typography.sizes.base, cvBasicDotTheme.typography.sizes.base * 1.1);
  assert.equal(scaled.spacing.spaceMd, cvBasicDotTheme.spacing.spaceMd * 1.18);
  assert.equal(scaled.layout.cardPadding, cvBasicDotTheme.layout.cardPadding * 1.18);
  // Page margin is paper geometry; scaling it would resize the printable area.
  assert.equal(scaled.layout.pageMargin, cvBasicDotTheme.layout.pageMargin);
});

test("default settings return the theme untouched", () => {
  assert.equal(applyResumeStyleToTheme(cvBasicDotTheme, DEFAULT_RESUME_STYLE), cvBasicDotTheme);
});

test("the renderer puts the style attributes on a descendant of the token root", () => {
  const renderer = read("app/components/resume-renderer/ResumeRenderer.tsx");

  // The tokens live on the root; the variants must not be applied there or the
  // alias lookup would resolve against the element being redefined.
  assert.match(renderer, /<div className="resume" \{\.\.\.resumeStyleDataAttributes\(cvStyle\)\}>/);
  assert.equal(renderer.includes('rootClassName'), true);
});

test("style is persisted on the document and frozen into the snapshot", () => {
  const server = read("app/lib/resume-server.ts");
  const publishRoute = read("app/api/resume/publish/route.ts");
  const rpc = read("supabase/migrations/20260901052107_publish_rpc_carries_style_settings.sql");

  // Document round-trip.
  assert.match(server, /RESUME_DOCUMENT_SELECT = "[^"]*style_settings/);
  assert.equal(server.includes("style_settings: normalizeResumeStyle(payload.styleSettings)"), true);
  assert.equal(publishRoute.includes("styleSettings: body.styleSettings"), true);

  // The snapshot carries its own copy, written once by the publish RPC.
  assert.match(server, /RESUME_PUBLISHED_CV_LOCALE_SELECT[\s\S]{0,240}style_settings/);
  assert.match(rpc, /coalesce\(d\.style_settings, '\{\}'::jsonb\)/);
});

test("published surfaces read the frozen style, not the editable document", () => {
  const server = read("app/lib/resume-server.ts");
  const pdfRoute = read("app/api/resume/export/pdf/route.ts");
  const publicPage = read("app/[personSlug]/[publicId]/page.tsx");

  // A published CV must not restyle itself when the owner later edits the
  // Master Resume, so both public surfaces read activeLocaleRow, not document.
  assert.equal(server.includes("cvStyle: normalizeResumeStyle(activeLocaleRow.style_settings)"), true);
  assert.equal(pdfRoute.includes("applyResumeStyleToTheme(cvBasicDotTheme, exportData.cvStyle)"), true);
  assert.equal(publicPage.includes("cvStyle={published.cvStyle}"), true);
});

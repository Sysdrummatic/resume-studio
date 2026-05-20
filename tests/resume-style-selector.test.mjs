import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const samplePath = path.join(process.cwd(), "app", "resume", "resume-view-client.tsx");
const rendererPath = path.join(process.cwd(), "app", "components", "resume-renderer", "ResumeRenderer.tsx");
const resumeStylesPath = path.join(process.cwd(), "app", "resume", "resume.css");
const globalStylesPath = path.join(process.cwd(), "app", "globals.css");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("sample CV delegates rendering to the shared resume renderer", () => {
  const sample = read(samplePath);
  const renderer = read(rendererPath);

  assert.equal(sample.includes("ResumeRenderer"), true);
  assert.equal(sample.includes('mode="public"'), true);
  assert.equal(sample.includes("actions={{"), true);
  assert.equal(renderer.includes('templateId: DEFAULT_TEMPLATE_ID'), false);
  assert.equal(renderer.includes("resume-template--sample-two-column"), true);
  assert.equal(renderer.includes("resume-theme--cv-basic-dot"), true);
});

test("legacy sample-only style selector and accent customizer are removed", () => {
  const sample = read(samplePath);
  const resumeStyles = read(resumeStylesPath);

  assert.equal(sample.includes("ACCENT_COLOR_STORAGE_KEY"), false);
  assert.equal(sample.includes("RESUME_STYLE_STORAGE_KEY"), false);
  assert.equal(sample.includes("resume-style-selector"), false);
  assert.equal(resumeStyles.includes(".resume-style-selector"), false);
});

test("resume document styling is consolidated in resume css instead of globals", () => {
  const renderer = read(rendererPath);
  const resumeStyles = read(resumeStylesPath);
  const globalStyles = read(globalStylesPath);

  assert.equal(renderer.includes('import "../../resume/resume.css";'), true);
  assert.equal(resumeStyles.includes(".resume-editor-basic .timeline"), true);
  assert.equal(resumeStyles.includes(".hero__export-button"), true);
  assert.equal(globalStyles.includes(".resume-editor-basic .timeline"), false);
});

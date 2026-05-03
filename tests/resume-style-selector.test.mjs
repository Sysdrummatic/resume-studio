import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.join(process.cwd(), "app", "resume", "resume-view-client.tsx");
const resumeStylesPath = path.join(process.cwd(), "app", "resume", "resume.css");
const globalStylesPath = path.join(process.cwd(), "app", "globals.css");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("sample CV imports its dedicated style file", () => {
  const source = read(componentPath);

  assert.equal(source.includes('import "./resume.css";'), true);
});

test("resume style selector stores accent color in the browser", () => {
  const source = read(componentPath);

  assert.equal(source.includes('const ACCENT_COLOR_STORAGE_KEY = "resume-studio:sample-cv-accent-color";'), true);
  assert.equal(source.includes("window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)"), true);
  assert.equal(source.includes("window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, accentColor)"), true);
  assert.equal(source.includes('type="color"'), true);
  assert.equal(source.includes("createAccentThemeStyle(accentColor)"), true);
});

test("resume style selector exposes registered CV styles", () => {
  const source = read(componentPath);

  assert.equal(source.includes("const AVAILABLE_RESUME_STYLES: ResumeStyle[]"), true);
  assert.equal(source.includes('code: "basic"'), true);
  assert.equal(source.includes("resume-style--${selectedStyle}"), true);
});

test("resume style selector closes on outside click and other header menus", () => {
  const source = read(componentPath);

  assert.equal(source.includes('const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";'), true);
  assert.equal(source.includes('const STYLE_SELECTOR_MENU_NAME = "resume-style-selector";'), true);
  assert.equal(source.includes('document.addEventListener("pointerdown", handlePointerDown, true);'), true);
  assert.equal(source.includes('document.removeEventListener("pointerdown", handlePointerDown, true);'), true);
  assert.equal(source.includes("styleSelectorRef.current?.contains(target)"), true);
  assert.equal(source.includes("announceHeaderMenuOpen(STYLE_SELECTOR_MENU_NAME);"), true);
  assert.equal(source.includes("event.detail !== STYLE_SELECTOR_MENU_NAME"), true);
});

test("resume style selector styles live in resume css only", () => {
  const resumeStyles = read(resumeStylesPath);
  const globalStyles = read(globalStylesPath);

  assert.equal(resumeStyles.includes(".resume-style-selector"), true);
  assert.equal(resumeStyles.includes(".resume-style-selector__trigger"), true);
  assert.equal(globalStyles.includes(".resume-style-selector"), false);
});

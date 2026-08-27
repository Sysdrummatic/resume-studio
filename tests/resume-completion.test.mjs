import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { computeResumeCompletion } from "../app/master-resume/resume-completion.ts";
import { defaultResumeDocument, normalizeResumeDocument } from "../app/lib/resume-schema.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("a freshly seeded document scores zero, not partial credit", () => {
  // defaultResumeDocument seeds blank rows in every array; counting those as
  // progress would show a misleading percentage on an untouched resume.
  const { percent, statuses, next } = computeResumeCompletion(defaultResumeDocument(""));

  assert.equal(percent, 0);
  assert.equal(Object.values(statuses).every((status) => status === "warn"), true);
  assert.equal(next?.id, "experience", "the heaviest unfinished section should be suggested first");
});

test("section weights total 100 so a fully filled resume reads 100%", () => {
  const resume = normalizeResumeDocument(
    {
      name: "Ariana Holt",
      brand_initials: "AH",
      contact: [{ label: "E-mail", value: "ariana@example.com" }],
      summary: [{ position: "Product Scientist", description: "Builds humane AI tools.", default: true }],
      experience: [{ period: "2022", company: "Nova Labs", role: "Lead", highlights: ["Shipped"] }],
      education: [{ period: "2015", school: "NYIT", degree: "MSc", detail: "" }],
      skills: [{ name: "Research", level: 5 }],
      languages: [{ name: "English", level_text: "Native", level: 5 }],
      courses: [{ year: 2024, name: "Systems Design" }],
      interests: ["Hiking"],
      tech_stack: ["Python"],
      qr_codes: [{ label: "LiveCV", image: "", size: 130 }],
    },
    "Ariana Holt",
  );

  const { percent, next } = computeResumeCompletion(resume);
  assert.equal(percent, 100);
  assert.equal(next, null);
});

test("partial progress is weighted, and the nudge names the biggest remaining win", () => {
  const resume = normalizeResumeDocument(
    {
      name: "Ariana Holt",
      contact: [{ label: "E-mail", value: "ariana@example.com" }],
      summary: [{ position: "Product Scientist", description: "Builds humane AI tools.", default: true }],
    },
    "Ariana Holt",
  );

  const { percent, statuses, next } = computeResumeCompletion(resume);
  // personal (20) + summary (15), nothing else has usable content.
  assert.equal(percent, 35);
  assert.equal(statuses.personal, "ok");
  assert.equal(statuses.summary, "ok");
  assert.equal(statuses.experience, "warn");
  assert.equal(next?.id, "experience");
  assert.equal(next?.weight, 25);
});

test("a name without any contact detail does not complete the personal section", () => {
  const resume = normalizeResumeDocument({ name: "Ariana Holt" }, "Ariana Holt");
  assert.equal(computeResumeCompletion(resume).statuses.personal, "warn");
});

test("editor renders the completion meter and per-section status dots", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const nav = read("app/master-resume/editor-section-nav.tsx");
  const styles = read("app/globals.css");

  assert.equal(editor.includes("computeResumeCompletion"), true);
  assert.equal(editor.includes('className="resume-editor-completion"'), true);
  assert.equal(editor.includes('role="progressbar"'), true);
  assert.equal(nav.includes("resume-editor-nav__status"), true);
  assert.equal(styles.includes(".resume-editor-nav__status[data-status=\"warn\"]"), true);
});

test("the side panel exposes Preview, History and Style tabs", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(editor.includes('useState<"preview" | "history" | "style">'), true);
  assert.equal(editor.includes('sidePanelTab === "style"'), true);
  assert.equal(editor.includes("resume-editor-style-panel"), true);
  // The template control is the one style setting backed by real rendering
  // behaviour, so it lives in the Style tab rather than beside the preview.
  assert.equal(editor.includes("setSelectedStyle(event.target.value as ResumeEditorStyle)"), true);
});

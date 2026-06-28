import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("dashboard shows language version count in master resume section", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const styles = read("app/globals.css");

  assert.equal(client.includes("localeSummary"), true);
  assert.equal(client.includes("formatCountLabel(languageVersions.length, \"language version\")"), true);
  assert.equal(client.includes("LanguageBadgeRail"), false);
  assert.equal(client.includes("AddLanguageModal"), false);
  assert.equal(styles.includes(".dashboard-chip"), true);
});

test("add language modal form validates and submits to language API", () => {
  const component = read("app/dashboard/AddLanguageModal.tsx");

  assert.equal(component.includes("export function AddLanguageModal"), true);
  assert.equal(component.includes("existingLanguageCodes: string[]"), true);
  assert.equal(component.includes("onSuccess: (language: ResumeUserLocaleRow) => void"), true);
  assert.equal(component.includes("onDelete?: (language: ResumeUserLocaleRow) => Promise<void>"), true);
  assert.equal(component.includes("onSetDefault?: (language: ResumeUserLocaleRow) => Promise<void>"), true);
  assert.equal(component.includes("normalizeCode"), true);
  assert.equal(component.includes("validateForm"), true);
  assert.equal(component.includes("/api/resume/languages"), true);
  assert.equal(component.includes("POST"), true);
  assert.equal(component.includes("code: normalized"), true);
  assert.equal(component.includes("label: label.trim()"), true);
  assert.equal(component.includes("shortLabel: shortLabel.trim() || undefined"), true);
  assert.equal(component.includes("createDocument: true"), true);
});

test("dashboard client keeps language options for publish flow without in-dashboard management UI", () => {
  const client = read("app/dashboard/dashboard-client.tsx");

  assert.equal(client.includes("languageVersions"), true);
  assert.equal(client.includes("publishableLocales"), true);
  assert.equal(client.includes("defaultLanguageVersion"), true);
  assert.equal(client.includes("languageOptions={languageVersions}"), true);
  assert.equal(client.includes("isAddLanguageModalOpen"), false);
  assert.equal(client.includes("refreshLanguages"), false);
});

test("dashboard language management preserves existing preset and publish behavior", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const page = read("app/dashboard/page.tsx");

  assert.equal(client.includes("Master Resume"), true);
  assert.equal(client.includes("Your CVs"), true);
  assert.equal(client.includes("PresetModal"), true);
  assert.equal(client.includes("PresetPreviewModal"), true);
  assert.equal(client.includes("PublishSavedVersionModal"), true);
  assert.equal(client.includes("publishableLocales"), true);
  assert.equal(client.includes("savePreset"), true);
  assert.equal(client.includes("publishPreset"), true);
  assert.equal(page.includes("fetchResumeUserLocalesForUser"), true);
  assert.equal(page.includes("bootstrapResumeUserLocales"), true);
  assert.equal(page.includes("fetchResumePresetsForUser"), true);
});

test("language API endpoint supports add and fetch operations", () => {
  const route = read("app/api/resume/languages/route.ts");

  assert.equal(route.includes("export async function GET"), true);
  assert.equal(route.includes("export async function POST"), true);
  assert.equal(route.includes("bootstrapResumeUserLocales"), true);
  assert.equal(route.includes("fetchResumeLanguageVersionsForUser"), true);
  assert.equal(route.includes("upsertResumeUserLocale"), true);
  assert.equal(route.includes("deleteResumeUserLocale"), true);
  assert.equal(route.includes("withDocuments"), true);
  assert.equal(route.includes("code:"), true);
  assert.equal(route.includes("label:"), true);
  assert.equal(route.includes("createDocument"), true);
});

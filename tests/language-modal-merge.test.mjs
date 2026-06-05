import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("language badge rail displays ordered language badges with plus button", () => {
  const component = read("app/dashboard/LanguageBadgeRail.tsx");

  assert.equal(component.includes("export function LanguageBadgeRail"), true);
  assert.equal(component.includes("languages: ResumeUserLocaleRow[]"), true);
  assert.equal(component.includes("onAddLanguage: () => void"), true);
  assert.equal(component.includes("onEditLanguage"), true);
  assert.equal(component.includes("[...languages].sort"), true);
  assert.equal(component.includes("sort_order"), true);
  assert.equal(component.includes("--accent-light"), true);
  assert.equal(component.includes("--accent-dark"), true);
  assert.equal(component.includes("<svg"), true);
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

test("dashboard client integrates language badge rail and modal", () => {
  const client = read("app/dashboard/dashboard-client.tsx");

  assert.equal(client.includes("import { LanguageBadgeRail }"), true);
  assert.equal(client.includes("import { AddLanguageModal }"), true);
  assert.equal(client.includes("languageVersions"), true);
  assert.equal(client.includes("isAddLanguageModalOpen"), true);
  assert.equal(client.includes("isLoadingLanguages"), true);
  assert.equal(client.includes("setLanguageVersions"), true);
  assert.equal(client.includes("/api/resume/languages?withDocuments=true"), true);
  assert.equal(client.includes("refreshLanguages"), true);
  assert.equal(client.includes("LanguageBadgeRail"), true);
  assert.equal(client.includes("AddLanguageModal"), true);
  assert.equal(client.includes("handleAddLanguageSuccess"), true);
  assert.equal(client.includes("handleSetDefaultLanguage"), true);
  assert.equal(client.includes("handleDeleteLanguage"), true);
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

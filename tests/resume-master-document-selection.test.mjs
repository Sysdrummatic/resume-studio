import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { pickMasterResumeDocument } = await import("../app/lib/resume-server.ts");

function doc(locale) {
  return { id: locale, user_id: "u1", locale, title: "", yaml_content: `locale: ${locale}`, schema_version: 1, updated_at: "" };
}

function lang(code, isDefault) {
  return { code, is_default: isDefault };
}

test("picks the document whose locale is flagged as the user's default", () => {
  // ocv-0177: a PL-first account (PL is_default, no "en" document at all)
  // must resolve to the PL document, not silently fall through to null or
  // an unrelated document.
  const documents = [doc("pl")];
  const languages = [lang("pl", true)];
  assert.equal(pickMasterResumeDocument(documents, languages)?.locale, "pl");
});

test("prefers the flagged default over a coincidentally-present 'en' document", () => {
  const documents = [doc("en"), doc("pl")];
  const languages = [lang("en", false), lang("pl", true)];
  assert.equal(pickMasterResumeDocument(documents, languages)?.locale, "pl");
});

test("falls back to 'en' when no language is flagged as default", () => {
  const documents = [doc("pl"), doc("en")];
  const languages = [lang("pl", false), lang("en", false)];
  assert.equal(pickMasterResumeDocument(documents, languages)?.locale, "en");
});

test("falls back to the first document when nothing matches a locale", () => {
  const documents = [doc("de")];
  const languages = [];
  assert.equal(pickMasterResumeDocument(documents, languages)?.locale, "de");
});

test("returns null for a brand-new account with no documents yet", () => {
  assert.equal(pickMasterResumeDocument([], []), null);
});

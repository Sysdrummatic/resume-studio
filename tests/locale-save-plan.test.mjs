import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { PARITY_MESSAGE, PARTIAL_SAVE_MESSAGE, parityFailure, partialSaveFailure } = await import("../app/master-resume/locale-save-plan.ts");

test("a 409 parity response becomes a keyed message naming the sections, never the server's English text", () => {
  const payload = {
    code: "parity",
    error: "English server text",
    parityIssues: [
      { kind: "count", locale: "en", collection: "experience", expected: 2, actual: 1 },
      { kind: "highlights", locale: "en", collection: "experience", index: 0, expected: 2, actual: 1 },
      { kind: "count", locale: "en", collection: "skills", expected: 3, actual: 2 },
    ],
  };

  assert.deepEqual(parityFailure(payload, "pl"), {
    locale: "pl",
    key: PARITY_MESSAGE,
    params: { locale: "pl", collections: "experience, skills" },
  });
  assert.equal(parityFailure({ code: "conflict" }, "pl"), null, "other failures are not parity failures");
  assert.equal(parityFailure({}, "pl"), null);
});

test("a partial save gives the editor the stored version to retry from and a localized explanation", () => {
  const document = { id: "doc-pl", updated_at: "v2" };

  assert.deepEqual(partialSaveFailure({ saved: true, document, incomplete: ["revision"], error: "x" }, "pl"), {
    document,
    message: { locale: "pl", key: PARTIAL_SAVE_MESSAGE, params: { locale: "pl" } },
  });
  assert.equal(partialSaveFailure({ error: "Publish failed." }, "pl"), null, "an ordinary failure keeps the old base");
  assert.equal(partialSaveFailure({ saved: true }, "pl"), null, "no version, no rebase");
});

test("editor failure messages exist in both the English and the Polish dictionary", () => {
  for (const locale of ["en", "pl"]) {
    const text = readAppDictionary(locale).editor.text;
    for (const key of [PARITY_MESSAGE, PARTIAL_SAVE_MESSAGE]) assert.ok(text[key], `${locale} translates ${key}`);
  }
});

test("the parity panel, its Match button and every parity message are translated into English and Polish", () => {
  const keys = [
    "Language version consistency",
    "{percent}% different from the other versions",
    "Match",
    "Show details",
    "Hide details",
    "All language versions have the same entries.",
    "The other language versions do not have the same entries as this one. Match brings them to this version's structure.",
    "Adding, removing or moving an entry in the form changes every language version at once. Match is for changes made by hand in YAML.",
    "The language versions do not have the same entries. Use Match in the YAML editor before saving.",
    "{where}: {actual} entries, this version has {expected}",
    "{where}: {field} differs from this version",
    "{where}: {actual} bullets, this version has {expected}",
    "{where}: a different summary is marked as default",
    "Matching removes text from {locales}, because this version has fewer entries or bullets. Continue?",
    "Removing this entry also removes its text in {locales}. Continue?",
    "Removing this bullet also removes text in {locales}. Continue?",
  ];
  for (const locale of ["en", "pl"]) {
    const text = readAppDictionary(locale).editor.text;
    for (const key of keys) assert.ok(text[key], `${locale} translates "${key}"`);
  }
  assert.equal(readAppDictionary("pl").editor.text.Match, "Dopasuj");
});

import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

register(pathToFileURL(path.join(process.cwd(), "tests/helpers/ts-extension-resolve.mjs")), import.meta.url);

const { hasNameMismatch } = await import(pathToFileURL(path.join(process.cwd(), "app/master-resume/import-review-modal.tsx")));

test("flags a clearly different name", () => {
  assert.equal(hasNameMismatch("Ariana Holt", "Steeve Tatums"), true);
});

test("does not flag the same name", () => {
  assert.equal(hasNameMismatch("Ariana Holt", "Ariana Holt"), false);
});

test("is case- and whitespace-insensitive", () => {
  assert.equal(hasNameMismatch("Ariana Holt", "  ARIANA   holt "), false);
});

test("does not flag when the current draft has no name yet (fresh draft)", () => {
  assert.equal(hasNameMismatch("", "Steeve Tatums"), false);
});

test("does not flag when the import found no name", () => {
  assert.equal(hasNameMismatch("Ariana Holt", ""), false);
});

test("does not flag when neither side has a name", () => {
  assert.equal(hasNameMismatch("", ""), false);
});

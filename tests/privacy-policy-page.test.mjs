import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const privacyPagePath = path.join(process.cwd(), "app", "privacy", "page.tsx");
const footerPath = path.join(process.cwd(), "app", "components", "footer.tsx");
const userClientPath = path.join(process.cwd(), "app", "user", "user-client.tsx");
const accountAccessClientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readDictionary(locale) {
  return yaml.load(readSource(path.join(process.cwd(), "app", "i18n", "locales", `${locale}.yaml`)));
}

function flattenDocument(document) {
  return document.sections.flatMap((section) => [
    section.title,
    ...section.paragraphs,
    ...(section.bullets || []),
    ...(section.after || []),
  ]);
}

test("privacy policy page renders the YAML-backed English and Polish documents", () => {
  const source = readSource(privacyPagePath);
  const requiredHeadings = {
    en: [
      "What Data We Collect",
      "Why We Process Your Data",
      "Who We Share Your Data With",
      "Data Retention",
      "Your Rights",
      "Cookies",
      "International Data Transfers",
      "Children",
      "Changes to This Policy",
      "Contact",
    ],
    pl: [
      "Jakie dane zbieramy",
      "Dlaczego przetwarzamy dane",
      "Komu udostępniamy dane",
      "Przechowywanie danych",
      "Twoje prawa",
      "Pliki cookie",
      "Międzynarodowe transfery danych",
      "Dzieci",
      "Zmiany w tej polityce",
      "Kontakt",
    ],
  };

  assert.equal(source.includes("dictionary.legal.privacy"), true);
  for (const locale of ["en", "pl"]) {
    const document = readDictionary(locale).legal.privacy;
    assert.equal(document.sections.length, 11, locale);
    for (const heading of requiredHeadings[locale]) {
      assert.equal(document.sections.some((section) => section.title.endsWith(heading)), true, `${locale}: ${heading}`);
    }
  }
});

test("privacy policy translations mention required processors and authority", () => {
  for (const locale of ["en", "pl"]) {
    const content = flattenDocument(readDictionary(locale).legal.privacy).join(" ");
    assert.equal(content.includes("Supabase"), true, locale);
    assert.equal(content.includes("Netlify"), true, locale);
    assert.equal(content.includes("UODO"), true, locale);
  }
});

test("privacy policy page is explicitly indexable", () => {
  const source = readSource(privacyPagePath);

  assert.match(source, /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,?\s*\}/);
});

test("homepage footer links to the privacy policy page", () => {
  const source = readSource(footerPath);

  assert.match(source, /href="\/privacy"/);
});

test("user menu / personal hub includes a Policies section linking to the privacy policy", () => {
  const source = readSource(userClientPath);

  assert.equal(source.includes("Policies"), true);
  assert.match(source, /href="\/privacy"/);
});

test("signup form links to the privacy policy", () => {
  const source = readSource(accountAccessClientPath);

  assert.match(source, /href="\/privacy"/);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const termsPagePath = path.join(process.cwd(), "app", "terms", "page.tsx");
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

test("terms of service page renders the YAML-backed English and Polish documents", () => {
  const source = readSource(termsPagePath);
  const requiredHeadings = {
    en: [
      "About These Terms",
      "The Service",
      "Eligibility and Accounts",
      "Your Content",
      "Acceptable Use",
      "Free Use and Future Changes",
      "Termination",
      "Disclaimers",
      "Limitation of Liability",
      "Governing Law",
      "Changes to These Terms",
      "Contact",
    ],
    pl: [
      "O tych warunkach",
      "Usługa",
      "Uprawnienia i konta",
      "Twoje treści",
      "Dozwolone korzystanie",
      "Bezpłatne korzystanie i przyszłe zmiany",
      "Zakończenie korzystania",
      "Wyłączenia odpowiedzialności",
      "Ograniczenie odpowiedzialności",
      "Prawo właściwe",
      "Zmiany w tych Warunkach",
      "Kontakt",
    ],
  };

  assert.equal(source.includes("dictionary.legal.terms"), true);
  for (const locale of ["en", "pl"]) {
    const document = readDictionary(locale).legal.terms;
    assert.equal(document.sections.length, 13, locale);
    for (const heading of requiredHeadings[locale]) {
      assert.equal(document.sections.some((section) => section.title.endsWith(heading)), true, `${locale}: ${heading}`);
    }
  }
});

test("terms of service page is explicitly indexable", () => {
  const source = readSource(termsPagePath);

  assert.match(source, /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,?\s*\}/);
});

test("terms of service minimum age matches the privacy policy", () => {
  for (const locale of ["en", "pl"]) {
    const terms = flattenDocument(readDictionary(locale).legal.terms).join(" ");
    const privacy = flattenDocument(readDictionary(locale).legal.privacy).join(" ");
    assert.match(privacy, /16/);
    assert.match(terms, /16/);
  }
});

test("homepage footer links to the terms of service page", () => {
  const source = readSource(footerPath);

  assert.match(source, /href="\/terms"/);
  assert.match(source, /href="\/privacy"/);
});

test("user menu / personal hub includes a Policies entry linking to the terms of service page", () => {
  const source = readSource(userClientPath);

  assert.equal(source.includes("Policies"), true);
  assert.match(source, /href="\/terms"/);
  assert.match(source, /href="\/privacy"/);
});

test("signup form links to the terms of service page", () => {
  const source = readSource(accountAccessClientPath);

  assert.match(source, /href="\/terms"/);
  assert.match(source, /href="\/privacy"/);
});

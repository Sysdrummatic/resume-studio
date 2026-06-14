import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const privacyPagePath = path.join(process.cwd(), "app", "privacy", "page.tsx");
const footerPath = path.join(process.cwd(), "app", "components", "footer.tsx");
const userClientPath = path.join(process.cwd(), "app", "user", "user-client.tsx");
const accountAccessClientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("privacy policy page contains all required section headings", () => {
  const source = readSource(privacyPagePath);
  const requiredHeadings = [
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
  ];

  for (const heading of requiredHeadings) {
    assert.equal(source.includes(heading), true, `Missing heading: ${heading}`);
  }
});

test("privacy policy page mentions required processors and authority", () => {
  const source = readSource(privacyPagePath);

  assert.equal(source.includes("Supabase"), true);
  assert.equal(source.includes("Netlify"), true);
  assert.equal(source.includes("UODO"), true);
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

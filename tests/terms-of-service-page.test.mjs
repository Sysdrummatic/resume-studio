import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const termsPagePath = path.join(process.cwd(), "app", "terms", "page.tsx");
const privacyPagePath = path.join(process.cwd(), "app", "privacy", "page.tsx");
const footerPath = path.join(process.cwd(), "app", "components", "footer.tsx");
const userClientPath = path.join(process.cwd(), "app", "user", "user-client.tsx");
const accountAccessClientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("terms of service page contains all required section headings", () => {
  const source = readSource(termsPagePath);
  const requiredHeadings = [
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
  ];

  for (const heading of requiredHeadings) {
    assert.equal(source.includes(heading), true, `Missing heading: ${heading}`);
  }
});

test("terms of service page is explicitly indexable", () => {
  const source = readSource(termsPagePath);

  assert.match(source, /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,?\s*\}/);
});

test("terms of service minimum age matches the privacy policy", () => {
  const termsSource = readSource(termsPagePath);
  const privacySource = readSource(privacyPagePath);

  const privacyAgeMatch = privacySource.match(/under the age of (\d+)/);
  assert.ok(privacyAgeMatch, "Privacy policy does not state a minimum age");

  assert.equal(termsSource.includes(`at least ${privacyAgeMatch[1]} years old`), true);
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

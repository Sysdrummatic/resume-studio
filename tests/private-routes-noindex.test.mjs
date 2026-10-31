import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const PRIVATE_PAGES = [
  "app/dashboard/page.tsx",
  "app/admin/page.tsx",
  "app/master-resume/page.tsx",
  "app/user/page.tsx",
  "app/onboarding/page.tsx",
  "app/onboarding/test-cv/[runId]/page.tsx",
  "app/settings/page.tsx",
];

const NOINDEX = /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/;

for (const file of PRIVATE_PAGES) {
  test(`${file} is noindex in its own metadata`, () => {
    assert.match(
      read(file),
      /export const metadata(: Metadata)? = \{|export async function generateMetadata/,
      "page must export metadata",
    );
    assert.match(read(file), NOINDEX);
  });
}

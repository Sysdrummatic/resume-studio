import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

test("landing footer links to docs and FAQ in every locale", () => {
  const footer = fs.readFileSync("app/components/footer.tsx", "utf8");
  assert.match(footer, /href="\/docs"/);
  assert.match(footer, /href="\/#faq"/);
  for (const locale of ["en", "pl"]) {
    const labels = readAppDictionary(locale).landing.footer;
    assert.ok(labels.docs && labels.faq, `${locale} footer labels`);
  }
});

test("public CV links back to the product and hides the link in print", () => {
  const page = fs.readFileSync("app/[personSlug]/[publicId]/page.tsx", "utf8");
  assert.match(page, /public-resume-route__cta/);
  assert.match(page, /landing\.cta\.primary_action/);
  const css = fs.readFileSync("app/globals.css", "utf8");
  assert.match(css, /@media print\s*\{\s*\.public-resume-route__cta\s*\{\s*display:\s*none/);
});

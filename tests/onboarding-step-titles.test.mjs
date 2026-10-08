import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import { readAppDictionary } from "./helpers/app-i18n.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { ONBOARDING_SECTIONS, ONBOARDING_REVIEW_STEP, ONBOARDING_PUBLISH_STEP } = await import("../app/lib/resume-onboarding.ts");

// The guide shows dictionary.onboarding.steps[step] as each step's heading and
// counts "step / steps.length": one title per step, in flow order.
const expected = {
  en: { "qr-codes": "QR codes", gdpr: "GDPR clause", review: "Review your first LiveCV" },
  pl: { "qr-codes": "Kody QR", gdpr: "Klauzula RODO", review: "Sprawdź swoje pierwsze LiveCV" },
};

for (const language of ["en", "pl"]) {
  test(`every onboarding step has its own title in ${language.toUpperCase()}`, () => {
    const steps = readAppDictionary(language).onboarding.steps;

    assert.equal(steps.length, ONBOARDING_PUBLISH_STEP + 1, "welcome, choice, one per section, review and publish");
    assert.ok(steps.every((title) => typeof title === "string" && title.trim()), "no step is untitled");
    for (const section of ["qr-codes", "gdpr"]) {
      assert.equal(steps[2 + ONBOARDING_SECTIONS.indexOf(section)], expected[language][section], `${section} step title`);
    }
    assert.equal(steps[ONBOARDING_REVIEW_STEP], expected[language].review);
  });
}

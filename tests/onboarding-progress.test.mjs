import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { default: OnboardingProgress } = await import("../app/onboarding/onboarding-progress.tsx");
const { ONBOARDING_SECTIONS } = await import("../app/lib/resume-onboarding.ts");
const steps = ["Welcome", "Start", ...ONBOARDING_SECTIONS, "Review", "Publish"];
const render = (step, finished = false) => renderToStaticMarkup(createElement(OnboardingProgress, {
  steps, step, finished, label: "Guide progress", completeLabel: "Complete",
}));

test("the progress axis lists every step and marks only the current step", () => {
  for (let step = 0; step < steps.length; step++) {
    const html = render(step);
    assert.equal((html.match(/<li\b/g) ?? []).length, steps.length);
    assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
    const active = html.match(/<li\b[^>]*aria-current="step"[^>]*>([\s\S]*?)<\/li>/)?.[1];
    assert.ok(active?.includes(steps[step]));
    assert.ok(active?.includes(`>${step + 1}</span>`));
    assert.equal((html.match(/data-state="complete"/g) ?? []).length, step);
    assert.doesNotMatch(html, /<(a|button)\b/, "The axis must not bypass form validation or save actions");
  }
});

test("going back reflects the current position without claiming the guide is complete", () => {
  assert.match(render(12), /value="86"/);
  assert.match(render(2), /value="14"/);
  assert.match(render(13), /value="93"/);
});

test("completion marks all steps and exposes 100 percent without an active form step", () => {
  const html = render(13, true);
  assert.equal((html.match(/data-state="complete"/g) ?? []).length, steps.length);
  assert.doesNotMatch(html, /aria-current="step"/);
  assert.match(html, /value="100"/);
  assert.match(html, /Complete/);
});

test("the progress axis uses supplied translated labels", () => {
  const html = renderToStaticMarkup(createElement(OnboardingProgress, {
    steps: ["Witaj", "Dane osobowe"], step: 1, finished: false,
    label: "Postęp przewodnika", completeLabel: "Gotowe",
  }));
  assert.match(html, /aria-label="Postęp przewodnika"/);
  assert.match(html, /Dane osobowe/);
});

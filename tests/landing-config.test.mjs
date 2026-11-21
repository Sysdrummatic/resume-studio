import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANDING_CONFIG_DEFAULTS, parseLandingConfig } from "../app/lib/landing-config.ts";

test("the landing config file parses, and its link is a real one", () => {
  const config = parseLandingConfig(readFileSync("content/landing.yaml", "utf8"));
  assert.ok(config.sampleLivecv.url.startsWith("/") || config.sampleLivecv.url.startsWith("https://"));
  assert.ok(config.sampleLivecv.label.length > 0);
});

test("an unsafe or broken config falls back to the defaults instead of breaking the page", () => {
  const withUrl = (url) => parseLandingConfig(`sample_livecv:\n  url: ${url}\n  label: x\n`);
  assert.equal(withUrl("/resume").sampleLivecv.url, "/resume");
  assert.equal(withUrl("https://opencivera.com/arianaholt").sampleLivecv.url, "https://opencivera.com/arianaholt");
  for (const bad of ["javascript:alert(1)", "//evil.example", "http://plain.example", "data:text/html,x"]) {
    assert.deepEqual(withUrl(bad), LANDING_CONFIG_DEFAULTS, bad);
  }
  assert.deepEqual(parseLandingConfig("sample_livecv: [unclosed"), LANDING_CONFIG_DEFAULTS);
  assert.deepEqual(parseLandingConfig(""), LANDING_CONFIG_DEFAULTS);
});

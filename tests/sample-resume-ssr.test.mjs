import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { loadSampleResumeData } = await import("../app/lib/sample-resume.ts");
const { default: ResumeViewClient } = await import("../app/resume/resume-view-client.tsx");

const data = await loadSampleResumeData();

test("sample data is read on the server for every configured locale", () => {
  assert.deepEqual(data.locales.map((locale) => locale.code), ["en", "pl"]);
  assert.equal(data.defaultLocale, "pl");
  for (const locale of data.locales) {
    assert.ok(locale.resume.experience.length > 0, `${locale.code} has experience`);
    assert.ok(locale.labels.summary_heading, `${locale.code} has localized labels`);
  }
});

for (const code of ["en", "pl"]) {
  test(`/resume HTML contains the ${code} CV without JavaScript`, () => {
    const html = renderToString(createElement(ResumeViewClient, { initialLocale: code, data }));
    const locale = data.locales.find((item) => item.code === code);

    assert.match(html, /<h1[^>]*>[^<]+<\/h1>/, "h1 is in the server HTML");
    assert.ok(html.includes(locale.labels.summary_heading), "localized section heading is rendered");
    assert.ok(html.includes(locale.resume.experience[0].company), "experience content is rendered");
    assert.doesNotMatch(html, /loading-indicator|Ładowanie|Loading/);
  });
}

test("an unknown locale falls back to the configured default", () => {
  const html = renderToString(createElement(ResumeViewClient, { initialLocale: "xx", data }));
  const fallback = data.locales.find((item) => item.code === data.defaultLocale);
  assert.ok(html.includes(fallback.labels.summary_heading));
});

test("the public sample path no longer loads the browser YAML parser or fetches", () => {
  const page = readFileSync("app/resume/page.tsx", "utf8");
  const client = readFileSync("app/resume/resume-view-client.tsx", "utf8");
  const landing = readFileSync("app/components/landing-sample-cv.tsx", "utf8");
  for (const source of [page, client, landing]) {
    assert.doesNotMatch(source, /js-yaml\.min\.js|jsyaml|fetch\(/);
  }
});

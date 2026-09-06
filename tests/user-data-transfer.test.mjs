import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUserDataBundleYaml,
  parseUserDataBundle,
  USER_DATA_BUNDLE_FORMAT,
  USER_DATA_BUNDLE_MAX_BYTES,
} from "../app/lib/user-data-transfer.ts";

const sampleInput = {
  languages: [
    { code: "en", label: "English", short_label: "EN", is_default: true, sort_order: 0 },
    { code: "pl", label: "Polski", short_label: "PL", is_default: false, sort_order: 1 },
  ],
  documents: [
    { locale: "en", title: "Master resume", yaml_content: "meta:\n  name: Test User\n" },
    { locale: "pl", title: "Master resume PL", yaml_content: "meta:\n  name: Test User\n" },
  ],
  cv_versions: [
    {
      title: "Frontend CV",
      default_locale: "en",
      allow_indexing: false,
      ai_generated: false,
      selection: { summary: [0], experience: [0, 1], education: [], courses: [], skills: [], interests: [], languages: [], tech_stack: [] },
      variants: [
        { locale: "pl", selection: { summary: [0], experience: [0], education: [], courses: [], skills: [], interests: [], languages: [], tech_stack: [] } },
      ],
    },
  ],
};

test("buildUserDataBundleYaml and parseUserDataBundle round-trip", () => {
  const yamlText = buildUserDataBundleYaml(sampleInput);
  const parsed = parseUserDataBundle(yamlText);

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.bundle.format, USER_DATA_BUNDLE_FORMAT);
  assert.equal(parsed.bundle.version, 1);
  assert.ok(parsed.bundle.exported_at);
  assert.deepEqual(parsed.bundle.languages, sampleInput.languages);
  assert.deepEqual(parsed.bundle.documents, sampleInput.documents);
  assert.deepEqual(parsed.bundle.cv_versions, sampleInput.cv_versions);
});

test("parseUserDataBundle rejects empty input", () => {
  assert.ok(parseUserDataBundle("").error);
  assert.ok(parseUserDataBundle("   \n").error);
});

test("parseUserDataBundle rejects invalid YAML", () => {
  const result = parseUserDataBundle("foo: [unclosed");
  assert.match(result.error, /not valid YAML/);
});

test("parseUserDataBundle rejects a plain resume YAML without the bundle signature", () => {
  const result = parseUserDataBundle("meta:\n  name: Test User\n");
  assert.match(result.error, /not an OpenCiVera user data export/);
});

test("parseUserDataBundle rejects unsupported versions", () => {
  const yamlText = buildUserDataBundleYaml(sampleInput).replace("version: 1", "version: 2");
  const result = parseUserDataBundle(yamlText);
  assert.match(result.error, /Unsupported export version/);
});

test("parseUserDataBundle rejects oversized files", () => {
  const padded = buildUserDataBundleYaml(sampleInput) + `\n# ${"x".repeat(USER_DATA_BUNDLE_MAX_BYTES)}`;
  const result = parseUserDataBundle(padded);
  assert.match(result.error, /too large/);
});

test("parseUserDataBundle rejects documents without yaml_content", () => {
  const broken = {
    ...sampleInput,
    documents: [{ locale: "en", title: "Master resume", ai_generated: false, yaml_content: "" }],
  };
  const result = parseUserDataBundle(buildUserDataBundleYaml(broken));
  assert.match(result.error, /non-empty yaml_content/);
});

test("parseUserDataBundle rejects document locales missing from languages", () => {
  const broken = {
    ...sampleInput,
    documents: [...sampleInput.documents, { locale: "de", title: "DE", ai_generated: false, yaml_content: "meta: {}\n" }],
  };
  const result = parseUserDataBundle(buildUserDataBundleYaml(broken));
  assert.match(result.error, /not listed in the languages section/);
});

test("parseUserDataBundle rejects non-two-letter locale codes", () => {
  const badLanguage = {
    ...sampleInput,
    languages: [{ code: "english", label: "English", short_label: "EN", is_default: true, sort_order: 0 }],
  };
  assert.match(parseUserDataBundle(buildUserDataBundleYaml(badLanguage)).error, /two-letter locale code/);

  const badVariant = {
    ...sampleInput,
    cv_versions: [{ ...sampleInput.cv_versions[0], variants: [{ locale: "polish", selection: {} }] }],
  };
  assert.match(parseUserDataBundle(buildUserDataBundleYaml(badVariant)).error, /two-letter locale/);
});

test("parseUserDataBundle rejects CV versions whose default locale has no document", () => {
  const broken = {
    ...sampleInput,
    cv_versions: [{ ...sampleInput.cv_versions[0], default_locale: "pl", variants: [] }],
    documents: [sampleInput.documents[0]],
  };
  const result = parseUserDataBundle(buildUserDataBundleYaml(broken));
  assert.match(result.error, /has no matching document/);
});

test("parseUserDataBundle rejects duplicate language codes", () => {
  const broken = {
    ...sampleInput,
    languages: [
      { code: "en", label: "English", short_label: "EN", is_default: true, sort_order: 0 },
      { code: "EN", label: "English again", short_label: "EN", is_default: false, sort_order: 1 },
    ],
    documents: [sampleInput.documents[0]],
    cv_versions: [],
  };
  const result = parseUserDataBundle(buildUserDataBundleYaml(broken));
  assert.match(result.error, /duplicate locale codes/);
});

test("parseUserDataBundle rejects a merge-key bomb (CVE GHSA-h67p-54hq-rp68)", () => {
  // The advisory's shape: one anchor with K keys, referenced R times in a
  // single merge list (`<<: [*base, *base, ...]`). Source text is O(K+R),
  // but js-yaml re-copies all K keys on every alias, so total merge work is
  // O(K*R) — quadratic in document size when K and R scale together.
  const keyCount = 10;
  const repeatCount = 10; // K*R = 100, comfortably over the 50-key cap below.
  const baseKeys = Array.from({ length: keyCount }, (_, i) => `k${i}: ${i}`).join(", ");
  const repeatedAlias = Array.from({ length: repeatCount }, () => "*base").join(", ");
  const bomb = `base: &base { ${baseKeys} }\nroot: { <<: [${repeatedAlias}] }\n`;

  const result = parseUserDataBundle(`format: ${USER_DATA_BUNDLE_FORMAT}\nversion: 1\n${bomb}`);
  assert.match(result.error, /not valid YAML/);
});

test("parseUserDataBundle requires at least one language and one document", () => {
  assert.match(parseUserDataBundle(buildUserDataBundleYaml({ ...sampleInput, languages: [] })).error, /at least one language/);
  assert.match(parseUserDataBundle(buildUserDataBundleYaml({ ...sampleInput, documents: [] })).error, /at least one document/);
});

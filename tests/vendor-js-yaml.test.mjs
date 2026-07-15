import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const vendorPath = path.join(dirname, "..", "public", "vendor", "js-yaml.min.js");

function loadVendoredJsYaml() {
  const source = fs.readFileSync(vendorPath, "utf8");
  const sandbox = { globalThis: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: vendorPath });
  return sandbox.globalThis.jsyaml;
}

test("vendored public/vendor/js-yaml.min.js parses normal YAML", () => {
  const jsyaml = loadVendoredJsYaml();
  const parsed = jsyaml.load("meta:\n  name: Test User\nskills: [a, b]\n");
  // Parsed objects come from the vm sandbox's realm, so compare via JSON
  // rather than assert.deepEqual (strict mode also checks prototypes).
  assert.equal(JSON.stringify(parsed), JSON.stringify({ meta: { name: "Test User" }, skills: ["a", "b"] }));
});

test("vendored public/vendor/js-yaml.min.js rejects a repeated-alias merge-key bomb by default (GHSA-h67p-54hq-rp68)", () => {
  const jsyaml = loadVendoredJsYaml();
  // Same fixture shape as tests/user-data-transfer.test.mjs (one anchor with K
  // keys, referenced R times in a single merge list), scaled past js-yaml's
  // own default maxTotalMergeKeys (10000) since the vendored bundle is the
  // raw library with no caller-supplied limit.
  const keyCount = 100;
  const repeatCount = 105; // K*R = 10500, just over the 10000 default cap.
  const baseKeys = Array.from({ length: keyCount }, (_, i) => `k${i}: ${i}`).join(", ");
  const repeatedAlias = Array.from({ length: repeatCount }, () => "*base").join(", ");
  const bomb = `base: &base { ${baseKeys} }\nroot: { <<: [${repeatedAlias}] }\n`;

  assert.throws(() => jsyaml.load(bomb), /maxTotalMergeKeys/);
});

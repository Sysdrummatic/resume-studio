import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0002 runtime defines supported OpenCV YAML contract boundary", () => {
  const server = read("app/lib/resume-server.ts");

  assert.equal(server.includes("OPEN_CV_PUBLIC_CONTRACT_MAJOR"), true);
  assert.equal(server.includes("isSupportedOpenCvContractVersion"), true);
  assert.equal(server.includes("OPEN_CV_MIN_SCHEMA_VERSION"), true);
});

test("ADR 0002 snapshot resolvers reject unsupported contract/schema versions", () => {
  const server = read("app/lib/resume-server.ts");

  assert.equal(server.includes("snapshot.open_cv_yaml_contract_version"), true);
  assert.equal(server.includes("Number(snapshot.schema_version) < OPEN_CV_MIN_SCHEMA_VERSION"), true);
  assert.equal(server.includes("return { foundSnapshotLink: true, published: null };"), true);
  assert.equal(server.includes("return null;"), true);
});

test("ADR 0002 policy doc defines compatibility and migration rules", () => {
  const policy = read("docs/guides/opencv-yaml-public-contract-policy.md");

  assert.equal(policy.includes("Versioning Rules"), true);
  assert.equal(policy.includes("Historical Snapshot Migration Policy"), true);
  assert.equal(policy.includes("major"), true);
});

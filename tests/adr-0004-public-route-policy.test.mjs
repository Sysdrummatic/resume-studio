import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0004 is accepted and checklist is complete", () => {
  const adr = read("docs/adr/0004-public-route-compatibility-policy.md");
  assert.equal(adr.includes("Status: Accepted"), true);
  assert.equal(adr.includes("- [x] Define compatibility redirect behavior for `/r/[slug]`."), true);
  assert.equal(adr.includes("- [x] Add observability for legacy route traffic and errors."), true);
  assert.equal(adr.includes("- [x] Define deprecation gates and rollback criteria."), true);
  assert.equal(adr.includes("- [x] Add compatibility regression tests for legacy links."), true);
  assert.equal(adr.includes("- [x] Publish migration communication plan for users."), true);
});

test("ADR 0004 rollout guide documents communication and rollback", () => {
  const guide = read("docs/guides/policies/public-route-compatibility-rollout.md");
  assert.equal(guide.includes("User Communication Checklist"), true);
  assert.equal(guide.includes("Rollback Triggers"), true);
  assert.equal(guide.includes("[public-route-compat]"), true);
});

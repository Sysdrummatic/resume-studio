import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0011 is superseded and records the initial dark-only rollout", () => {
  const adr = read("docs/adr/0011-portal-theme-dark-default-light-deferred.md");

  assert.equal(adr.includes("Status: Superseded"), true);
  assert.equal(adr.includes("Superseded by: [ADR 0012]"), true);
  assert.equal(adr.includes("`dark` is the default and only enabled application theme for now."), true);
  assert.equal(adr.includes("`light` is modeled as a future option"), true);
  assert.equal(adr.includes("theme switch is visible in the top bar"), true);
  assert.equal(adr.includes("it remains inactive"), true);
  assert.equal(adr.includes("CV styles remain explicitly outside the scope"), true);
  assert.equal(adr.includes("- [x] Add a visible but inactive theme switch in the top bar."), true);
  assert.equal(adr.includes("- [x] Preserve `app/resume/resume.css` as a separate CV styling boundary."), true);
});

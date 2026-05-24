import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0012 accepts portal light mode within the app theme boundary", () => {
  const adr = read("docs/adr/0012-portal-theme-light-mode-material-you.md");

  assert.equal(adr.includes("Status: Accepted"), true);
  assert.equal(adr.includes("`dark` remains the default application theme."), true);
  assert.equal(adr.includes("`light` becomes an enabled application theme"), true);
  assert.equal(adr.includes("`OpenCiVera-theme` cookie"), true);
  assert.equal(adr.includes("Material You / Material Design 3"), true);
  assert.equal(adr.includes("CV styling remains explicitly out of scope."), true);
  assert.equal(adr.includes("- [x] Activate the top-bar theme switch."), true);
});


import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.join(process.cwd(), "app", "components", "header-account-menu.tsx");

function readSource() {
  return fs.readFileSync(componentPath, "utf8");
}

test("header account menu does not hide on home route", () => {
  const source = readSource();

  assert.equal(source.includes('pathname === "/"'), false);
  assert.equal(source.includes("if (!actor)"), true);
});

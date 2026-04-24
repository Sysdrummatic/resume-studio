import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const homePagePath = path.join(process.cwd(), "app", "page.tsx");

function readHomePageSource() {
  return fs.readFileSync(homePagePath, "utf8");
}

test("home page redirects authenticated users to dashboard", () => {
  const source = readHomePageSource();

  assert.equal(source.includes('import { redirect } from "next/navigation";'), true);
  assert.equal(source.includes('import { getCurrentActor } from "./lib/auth-server";'), true);
  assert.equal(source.includes("const actor = await getCurrentActor();"), true);
  assert.equal(source.includes('if (actor) {'), true);
  assert.equal(source.includes('redirect("/dashboard");'), true);
});

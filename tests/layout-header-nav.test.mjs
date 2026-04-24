import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

function readLayoutSource() {
  return fs.readFileSync(layoutPath, "utf8");
}

test("header renders login link for guests in primary nav", () => {
  const source = readLayoutSource();

  assert.equal(source.includes('{!actor && <Link href="/login">Login</Link>}'), true);
  assert.equal(source.includes('{!actor && <Link href="/login">Sign in</Link>}'), false);
});

test("header keeps login link before Sample CV in primary nav", () => {
  const source = readLayoutSource();
  const loginIndex = source.indexOf('{!actor && <Link href="/login">Login</Link>}');
  const sampleCvIndex = source.indexOf('<Link href="/resume">Sample CV</Link>');

  assert.notEqual(loginIndex, -1);
  assert.notEqual(sampleCvIndex, -1);
  assert.equal(loginIndex < sampleCvIndex, true);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

function readLayoutSource() {
  return fs.readFileSync(layoutPath, "utf8");
}

test("header renders Login link for guests in primary nav", () => {
  const source = readLayoutSource();

  assert.equal(source.includes('{!actor && <Link href="/login">Login</Link>}'), true);
  assert.equal(source.includes('{!actor && <Link href="/login">Sign in</Link>}'), false);
});

test("header keeps Sample CV only for authenticated users", () => {
  const source = readLayoutSource();
  const guestSampleCvIndex = source.indexOf('{!actor && <Link href="/resume">Sample CV</Link>}');
  const authSampleCvIndex = source.indexOf('{actor && <Link href="/resume">Sample CV</Link>}');

  assert.equal(guestSampleCvIndex, -1);
  assert.notEqual(authSampleCvIndex, -1);
});

test("header disables brand link for authenticated users", () => {
  const source = readLayoutSource();

  assert.equal(source.includes('actor ? ('), true);
  assert.equal(source.includes('<span className="app-brand" aria-disabled="true">'), true);
  assert.equal(source.includes('<Link className="app-brand" href="/">'), true);
});

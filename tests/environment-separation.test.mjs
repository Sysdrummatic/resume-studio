import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/);

test("only .env*.example files are tracked (no real env file can be committed)", () => {
  const envFiles = tracked.filter((f) => /(^|\/)\.env/.test(f));
  assert.ok(envFiles.length > 0);
  for (const f of envFiles) assert.match(f, /\.example$/, f);
});

test("tracked env examples hold no Supabase project refs, JWTs or secrets", () => {
  for (const f of tracked.filter((f) => /(^|\/)\.env.*\.example$/.test(f))) {
    const src = fs.readFileSync(f, "utf8");
    assert.equal(/supabase\.co|eyJ[A-Za-z0-9_-]{10,}|sb_secret_/.test(src), false, f);
  }
});

test("verification runbook names both projects and the evidence date", () => {
  const doc = fs.readFileSync("docs/runbooks/environment-separation.md", "utf8");
  assert.match(doc, /ypzlxhhhvnffnxebutgw/);
  assert.match(doc, /aqmarbfzpdcnwwawbulv/);
  assert.match(doc, /Last verified: \d{4}-\d{2}-\d{2}/);
});

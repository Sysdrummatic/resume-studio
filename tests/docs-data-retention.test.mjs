import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adrPath = path.join(process.cwd(), "docs", "adr", "0016-account-data-retention-and-deletion.md");
const adrReadmePath = path.join(process.cwd(), "docs", "adr", "README.md");
const runbookPath = path.join(process.cwd(), ".codex", "runbooks", "data-subject-request.md");
const checklistPath = path.join(process.cwd(), "docs", "guides", "processor-compliance-checklist.md");

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("account data retention ADR exists and covers required topics", () => {
  const source = readSource(adrPath);

  assert.match(source, /30-day|30 days/);
  assert.equal(source.includes("cascade"), true);
  assert.equal(source.includes("Known Gaps"), true);
  assert.equal(source.includes("admin_audit_logs"), true);
});

test("ADR README links to the new account data retention ADR", () => {
  const source = readSource(adrReadmePath);

  assert.match(source, /0016-account-data-retention-and-deletion\.md/);
});

test("data subject request runbook exists and covers required steps", () => {
  const source = readSource(runbookPath);

  assert.match(source, /30-day|30 days/);
  assert.match(source, /SQL editor/);
  assert.equal(source.includes("one month"), true);
});

test("processor compliance checklist exists and mentions required processors", () => {
  const source = readSource(checklistPath);

  assert.equal(source.includes("Supabase"), true);
  assert.equal(source.includes("Netlify"), true);
});

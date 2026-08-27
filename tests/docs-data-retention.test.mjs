import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adrPath = path.join(process.cwd(), "docs", "adr", "0016-account-data-retention-and-deletion.md");
const adrReadmePath = path.join(process.cwd(), "docs", "adr", "README.md");

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

// The data-subject-request runbook and processor compliance checklist moved to
// the private `OpenCiVera-Project` repo and are no longer verifiable from here.

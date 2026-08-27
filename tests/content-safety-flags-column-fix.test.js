const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260826000000_fix_content_safety_flags_column_drift.sql",
);

test("content_safety_flags column drift fix renames matched_snippet back to match_hash", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.equal(sql.includes("alter table public.content_safety_flags"), true);
  assert.equal(sql.includes("rename column matched_snippet to match_hash"), true);
});

test("the rename is conditional, not a bare ALTER, so it's safe on a fresh database", () => {
  // Regression test for a real CI failure: a database built fresh from the
  // full migration history never has `matched_snippet` — the original
  // 20260713000000 migration already creates `match_hash` directly. Only
  // prod/test drifted via some out-of-band change outside the migration
  // history. An unconditional `rename column` fails with "column
  // matched_snippet does not exist" on any environment built from these
  // migrations alone (confirmed by the database-security CI job).
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.equal(/do\s+\$\$/i.test(sql), true);
  assert.equal(/information_schema\.columns/i.test(sql), true);
  assert.equal(/if\s+exists\s*\(/i.test(sql), true);
});

test("write path (content-safety-audit.ts) and read path (admin/audit page) agree on match_hash", () => {
  const writePath = fs.readFileSync(
    path.join(__dirname, "..", "app", "lib", "content-safety-audit.ts"),
    "utf8",
  );
  const readPath = fs.readFileSync(path.join(__dirname, "..", "app", "admin", "audit", "page.tsx"), "utf8");

  assert.equal(writePath.includes("match_hash:"), true);
  assert.equal(readPath.includes("match_hash"), true);
  // Neither side should still reference the drifted live column name.
  assert.equal(writePath.includes("matched_snippet"), false);
  assert.equal(readPath.includes("matched_snippet"), false);
});

test("flagSuspiciousResumeContent is wired into every route that persists user-authored resume YAML", () => {
  // Regression test for a confirmed dead-wiring bug: the detector was only
  // ever called from POST /api/resume/draft, which has zero callers in the
  // client — so no Content Safety Flag could ever be recorded from real
  // usage. Text-based (not a runtime import) because these route files
  // transitively import supabase-http.ts via an extensionless relative
  // import, which Node's type-stripping can't resolve outside a bundler —
  // the same constraint documented for email.ts/env.ts.
  const publishRoute = fs.readFileSync(
    path.join(__dirname, "..", "app", "api", "resume", "publish", "route.ts"),
    "utf8",
  );
  const importRoute = fs.readFileSync(
    path.join(__dirname, "..", "app", "api", "resume", "transfer", "import", "route.ts"),
    "utf8",
  );

  assert.equal(publishRoute.includes("flagSuspiciousResumeContent("), true);
  assert.equal(importRoute.includes("flagSuspiciousResumeContent("), true);
});

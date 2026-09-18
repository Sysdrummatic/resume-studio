import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260918000000_prune_resume_revisions_history.sql");

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("resume_revisions gets an after-insert trigger that prunes older rows past the last 40 per document", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("create or replace function public.prune_resume_revisions()"), true);
  assert.equal(sql.includes("security definer"), true);
  assert.equal(sql.includes("set search_path = public"), true);
  assert.match(sql, /after insert on public\.resume_revisions/);
  assert.match(sql, /execute procedure public\.prune_resume_revisions\(\);/);
  // Scoped to the inserted row's own document - must never prune another
  // user's revisions.
  assert.match(sql, /where document_id = new\.document_id/);
  // fetchRevisions (app/lib/resume-server.ts) never reads past the 40 most
  // recent rows, so the retention window must match it exactly - otherwise
  // this trigger would silently delete revisions the UI can still show.
  assert.match(sql, /order by revision_number desc\s*\n\s*offset 40 limit 1/);
});

test("migration backfills existing documents that already exceed the retention window", () => {
  const sql = loadMigration();

  assert.match(sql, /delete from public\.resume_revisions rr/);
  assert.match(sql, /row_number\(\) over \(partition by document_id order by revision_number desc\)/);
  assert.match(sql, /ranked\.rn > 40/);
});

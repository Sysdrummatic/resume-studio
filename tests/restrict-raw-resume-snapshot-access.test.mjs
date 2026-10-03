import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// The snapshot tables hold the full private Experience Base YAML (ADR 0002 /
// ADR 0008). Only the server-side resolvers in app/lib/resume-server.ts
// (useServiceRole: true) may turn a snapshot into selection-filtered public
// content; this migration is what stops anon/authenticated clients reading
// the raw rows directly through PostgREST.
const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260927120737_restrict_raw_resume_snapshot_access.sql",
);

function migration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("migration drops the anon-facing public-select policies on both snapshot tables", () => {
  const sql = migration();

  assert.equal(
    sql.includes('drop policy if exists "resume_published_cvs_select_active_public"'),
    true,
  );
  assert.equal(
    sql.includes('drop policy if exists "resume_published_cv_locales_select_active_public"'),
    true,
  );
});

test("migration revokes the anon grant on both snapshot tables", () => {
  const sql = migration();

  assert.equal(sql.includes("revoke select on public.resume_published_cvs from anon"), true);
  assert.equal(sql.includes("revoke select on public.resume_published_cv_locales from anon"), true);
});

test("migration is additive: it never drops the owner-select policies or the tables/columns themselves", () => {
  const sql = migration();

  assert.equal(sql.includes("drop table"), false);
  assert.equal(sql.includes("drop column"), false);
  assert.equal(sql.includes('drop policy if exists "resume_published_cvs_select_owner"'), false);
  assert.equal(sql.includes('drop policy if exists "resume_published_cv_locales_select_owner"'), false);
  assert.equal(sql.includes("revoke select on public.resume_published_cvs from authenticated"), false);
  assert.equal(sql.includes("revoke select on public.resume_published_cv_locales from authenticated"), false);
});

test("every server-side snapshot read goes through the service role, so the anon revoke breaks nothing", () => {
  const serverSource = fs.readFileSync(
    path.join(process.cwd(), "app", "lib", "resume-server.ts"),
    "utf8",
  );

  // Every queryTable({ table: "resume_published_cvs" | "resume_published_cv_locales", ... })
  // call in the resolver must set useServiceRole: true; a call that fell back
  // to the caller's (anon) session would start failing once this migration
  // revokes anon SELECT.
  const blocks = serverSource.matchAll(
    /table:\s*"(resume_published_cvs|resume_published_cv_locales)"[\s\S]*?\}\);/g,
  );
  const checked = [];
  for (const [block, table] of blocks) {
    checked.push(table);
    assert.match(
      block,
      /useServiceRole:\s*true/,
      `${table} query must use the service role now that anon SELECT is revoked:\n${block}`,
    );
  }
  assert.ok(checked.length > 0, "expected at least one resume_published_cv(s|_locales) query to check");
});

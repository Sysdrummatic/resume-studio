const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260713000000_content_safety_flags.sql");

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("content_safety_flags table exists with staff-only select RLS", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("create table if not exists public.content_safety_flags"), true);
  assert.equal(sql.includes("alter table public.content_safety_flags enable row level security"), true);
  assert.equal(sql.includes('create policy "content_safety_flags_select_staff"'), true);
  assert.equal(sql.includes("using (public.is_staff_user())"), true);
});

test("user_id cascades on delete, unlike admin_audit_logs' restrict, so self-service account deletion is never blocked", () => {
  const sql = loadMigration();
  const ddlOnly = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  assert.equal(/user_id\s+uuid\s+not\s+null\s+references\s+public\.profiles\(id\)\s+on\s+delete\s+cascade/i.test(ddlOnly), true);
  assert.equal(/on\s+delete\s+restrict/i.test(ddlOnly), false);
});

test("no insert policy is granted to non-service-role clients", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("content_safety_flags_insert"), false);
});

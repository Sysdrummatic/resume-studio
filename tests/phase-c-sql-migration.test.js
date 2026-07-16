const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260410010000_phase_c_auth_rbac_admin.sql",
);

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("phase C migration defines required RPC functions", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("create or replace function public.set_user_role"), true);
  assert.equal(sql.includes("create or replace function public.set_user_active"), true);
  assert.equal(sql.includes("create or replace function public.can_delete_user_account"), true);
  assert.equal(sql.includes("create or replace function public.get_staff_user_overview"), true);
  assert.equal(sql.includes("create or replace function public.log_admin_action"), true);
});

test("phase C migration grants execute permissions to authenticated role", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("grant execute on function public.set_user_role(uuid, text) to authenticated;"), true);
  assert.equal(sql.includes("grant execute on function public.set_user_active(uuid, boolean) to authenticated;"), true);
  assert.equal(sql.includes("grant execute on function public.can_delete_user_account(uuid) to authenticated;"), true);
  assert.equal(sql.includes("grant execute on function public.get_staff_user_overview() to authenticated;"), true);
});

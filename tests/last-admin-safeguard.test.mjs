import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260614_prevent_last_admin_deletion.sql",
);
const routePath = path.join(process.cwd(), "app", "api", "user", "account", "route.ts");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("migration defines is_last_admin and a BEFORE DELETE trigger on profiles guarding admin rows", () => {
  const source = read(migrationPath);

  assert.equal(source.includes("create or replace function public.is_last_admin(p_user_id uuid)"), true);
  assert.equal(source.includes("create or replace function public.prevent_last_admin_deletion()"), true);
  assert.equal(source.includes("before delete on public.profiles"), true);
  assert.equal(source.includes("when (old.role = 'admin')"), true);
  assert.equal(source.includes("raise exception"), true);
});

test("DELETE /api/user/account checks last-admin/only-account status for admin callers before deleting", () => {
  const source = read(routePath);

  assert.equal(fs.existsSync(routePath), true);
  assert.equal(/if\s*\(\s*role\s*===\s*"admin"\s*\)/.test(source), true);

  const adminCheckIndex = source.search(/if\s*\(\s*role\s*===\s*"admin"\s*\)/);
  const deleteIndex = source.indexOf("deleteAuthUserAsService(");
  assert.notEqual(adminCheckIndex, -1);
  assert.notEqual(deleteIndex, -1);
  assert.ok(adminCheckIndex < deleteIndex, "Admin last-admin check must run before account deletion.");

  assert.equal(source.includes('functionName: "is_last_admin"'), true);
  assert.equal(source.includes('functionName: "is_only_profile"'), true);
});

test("DELETE /api/user/account leaves the non-admin deletion path unchanged", () => {
  const source = read(routePath);

  const adminCheckIndex = source.search(/if\s*\(\s*role\s*===\s*"admin"\s*\)/);
  const beforeAdminCheck = source.slice(0, adminCheckIndex);

  assert.equal(beforeAdminCheck.includes("is_last_admin"), false);
  assert.equal(beforeAdminCheck.includes("is_only_profile"), false);
});

test("DELETE /api/user/account returns distinct 409 responses for last_admin and only_account", () => {
  const source = read(routePath);

  assert.equal(/error:\s*"last_admin"/.test(source), true);
  assert.equal(/error:\s*"only_account"/.test(source), true);
  assert.equal(source.includes("only_account") && source.includes("last_admin"), true);

  const lastAdminBlock = source.slice(source.indexOf('"last_admin"') - 100, source.indexOf('"last_admin"') + 200);
  const onlyAccountBlock = source.slice(source.indexOf('"only_account"') - 100, source.indexOf('"only_account"') + 200);
  assert.equal(lastAdminBlock.includes("409"), true);
  assert.equal(onlyAccountBlock.includes("409"), true);
});

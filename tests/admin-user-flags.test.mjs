import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260711_profile_test_and_staff_flags.sql",
);
const patchRoutePath = path.join(process.cwd(), "app", "api", "admin", "users", "[userId]", "route.ts");
const listRoutePath = path.join(process.cwd(), "app", "api", "admin", "users", "route.ts");
const clientPath = path.join(process.cwd(), "app", "admin", "admin-users-client.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("migration adds both flag columns, a guarded setter RPC, and audit logging", () => {
  const source = read(migrationPath);

  assert.equal(source.includes("add column is_test_user boolean not null default false"), true);
  assert.equal(source.includes("add column is_ocv_staff boolean not null default false"), true);
  assert.equal(source.includes("create or replace function public.set_user_flag(target_user_id uuid, flag_name text, flag_value boolean)"), true);
  assert.equal(source.includes("'user.flag_updated'"), true);
  assert.equal(source.includes("Manager can modify only user/recruiter."), true);
  assert.equal(source.includes("Manager cannot modify own account flags."), true);
  assert.equal(source.includes("grant execute on function public.set_user_flag(uuid, text, boolean) to authenticated"), true);
});

test("migration excludes flagged users from every platform counter and reports excluded counts", () => {
  const source = read(migrationPath);
  const statsBody = source.slice(source.indexOf("create or replace function public.get_admin_platform_stats"));

  assert.equal((statsBody.match(/not \(is_test_user or is_ocv_staff\)/g) || []).length >= 2, true);
  assert.equal((statsBody.match(/not \(p\.is_test_user or p\.is_ocv_staff\)/g) || []).length >= 3, true);
  assert.equal(statsBody.includes("excluded_test_users"), true);
  assert.equal(statsBody.includes("excluded_staff_users"), true);
});

test("migration exposes flags in get_staff_user_overview", () => {
  const source = read(migrationPath);
  const overviewBody = source.slice(source.indexOf("create or replace function public.get_staff_user_overview"));
  const statsIndex = overviewBody.indexOf("get_admin_platform_stats");
  const scoped = statsIndex === -1 ? overviewBody : overviewBody.slice(0, statsIndex);

  assert.equal(scoped.includes("p.is_test_user"), true);
  assert.equal(scoped.includes("p.is_ocv_staff"), true);
});

test("PATCH route accepts isTestUser/isOcvStaff booleans and calls set_user_flag", () => {
  const source = read(patchRoutePath);

  assert.equal(source.includes("isTestUser?: boolean"), true);
  assert.equal(source.includes("isOcvStaff?: boolean"), true);
  assert.equal(source.includes('functionName: "set_user_flag"'), true);
  assert.equal(source.includes('typeof nextValue !== "boolean"'), true);
});

test("GET route surfaces flags and excluded stats", () => {
  const source = read(listRoutePath);

  assert.equal(source.includes("isTestUser: row.is_test_user"), true);
  assert.equal(source.includes("isOcvStaff: row.is_ocv_staff"), true);
  assert.equal(source.includes("excludedTestUsers"), true);
  assert.equal(source.includes("excludedStaffUsers"), true);
});

test("admin client renders flag checkboxes and excluded breakdown", () => {
  const source = read(clientPath);

  assert.equal(source.includes("<th>Test user</th>"), true);
  assert.equal(source.includes("<th>OCV Staff</th>"), true);
  assert.equal(source.includes('handleFlagToggle(user.id, "isTestUser"'), true);
  assert.equal(source.includes('handleFlagToggle(user.id, "isOcvStaff"'), true);
  assert.equal(source.includes("excludedTestUsers"), true);
  assert.equal(source.includes("excludedStaffUsers"), true);
});

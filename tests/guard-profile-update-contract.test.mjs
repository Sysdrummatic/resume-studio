// Contract tests for the guard_profile_update() trigger.
//
// This trigger fires BEFORE UPDATE on public.profiles and enforces all write-access
// rules. The tests below lock in every branch so a future edit to the trigger
// or any related helper immediately surfaces a named failure.
//
// Coverage map (matches the function's branch order):
//   1. Role-detection – reads jwt_role from BOTH GUCs (legacy + current PostgREST)
//   2. service_role bypass – must short-circuit before any actor check
//   3. admin bypass – admin can update anything
//   4. manager own-profile – can change own non-role fields, cannot change own role
//   5. manager cross-user target – allowed only for user/recruiter targets
//   6. manager promotion cap – cannot set a target's role outside user/recruiter
//   7. user own-profile – can update safe fields; role and is_active are locked
//   8. cross-user fallback – any other combination is blocked
//   9. Trigger attachment – the trigger must be attached to the profiles table
//  10. Helper safety – current_user_role() is SECURITY DEFINER (avoids RLS on itself)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

// The authoritative source of the trigger is the fix migration.
// If guard_profile_update() is redefined later, add the new file here as well.
const GUARD_MIGRATIONS = [
  "supabase/migrations/20260605_fix_guard_profile_update_service_role.sql",
];

function guardSql() {
  return GUARD_MIGRATIONS.map((f) => read(f).toLowerCase()).join("\n");
}

// ── 1. Role-detection reads both GUCs ──────────────────────────────────────
test("guard reads jwt_role from the modern request.jwt.claims JSON GUC", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("current_setting('request.jwt.claims', true)"),
    true,
    "Must read claims from the current PostgREST JSON GUC (request.jwt.claims).",
  );
  assert.equal(
    sql.includes("->> 'role'"),
    true,
    "Must extract 'role' from the JSON claims object.",
  );
});

test("guard retains the legacy request.jwt.claim.role GUC as fallback for older PostgREST", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("current_setting('request.jwt.claim.role', true)"),
    true,
    "Legacy per-claim GUC must be retained as first coalesce arg for PostgREST <v9 compatibility.",
  );
});

// ── 2. service_role bypass ─────────────────────────────────────────────────
test("guard short-circuits for service_role before any actor_id or actor_role check", () => {
  const sql = guardSql();
  const serviceBypass = sql.indexOf("if jwt_role = 'service_role' then");
  const adminCheck    = sql.indexOf("if actor_role = 'admin' then");

  assert.notEqual(serviceBypass, -1, "service_role bypass branch must exist.");
  assert.notEqual(adminCheck, -1, "admin bypass branch must exist.");
  assert.ok(
    serviceBypass < adminCheck,
    "service_role bypass must appear before the admin role check so it fires even when auth.uid() is NULL.",
  );
});

test("guard returns new immediately when jwt_role is service_role", () => {
  const sql = guardSql();
  // The pattern is: if jwt_role = 'service_role' then return new; end if;
  assert.match(
    sql.replace(/\s+/g, " "),
    /if jwt_role = 'service_role' then return new; end if;/,
    "service_role bypass must unconditionally return new.",
  );
});

// ── 3. Admin bypass ────────────────────────────────────────────────────────
test("guard allows admin to update any profile unconditionally", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("if actor_role = 'admin' then"),
    true,
    "Admin bypass branch must be present.",
  );
  // Verify the admin branch just returns new without raising.
  const adminIdx = sql.indexOf("if actor_role = 'admin' then");
  const snippet  = sql.slice(adminIdx, adminIdx + 60).replace(/\s+/g, " ");
  assert.match(snippet, /if actor_role = 'admin' then return new;/);
});

// ── 4. Manager own-profile ─────────────────────────────────────────────────
test("guard blocks a manager from changing their own role", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("manager cannot modify own role."),
    true,
    "Exception message for manager self-role change must be present.",
  );
});

test("guard allows a manager to update their own non-role fields", () => {
  const sql = guardSql();
  // The manager-own branch checks new.role <> old.role, then returns new — no other block.
  const ownBranch = sql.slice(
    sql.indexOf("if old.id = actor_id then"),
    sql.indexOf("manager can manage only user and recruiter"),
  );
  assert.equal(
    ownBranch.includes("return new;"),
    true,
    "Manager own-profile branch must return new when role is unchanged.",
  );
});

// ── 5. Manager cross-user target restriction ───────────────────────────────
test("guard blocks a manager from updating a manager or admin target", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("manager can manage only user and recruiter accounts."),
    true,
    "Guard must reject manager edits on accounts with role manager/admin.",
  );
  // The check reads old.role (current target role) before allowing the update.
  assert.match(
    sql.replace(/\s+/g, " "),
    /if old\.role not in \('user', 'recruiter'\) then raise exception 'manager can manage only user and recruiter accounts\./,
  );
});

// ── 6. Manager promotion cap ───────────────────────────────────────────────
test("guard blocks a manager from promoting a target role above user/recruiter", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("manager cannot promote role above user/recruiter."),
    true,
    "Guard must reject any new.role outside user/recruiter set by a manager.",
  );
  assert.match(
    sql.replace(/\s+/g, " "),
    /if new\.role not in \('user', 'recruiter'\) then raise exception 'manager cannot promote role above user\/recruiter\./,
  );
});

// ── 7. User own-profile ────────────────────────────────────────────────────
test("guard blocks a user from changing their own role", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("users cannot change role."),
    true,
    "Guard must raise when a non-staff user attempts to change their own role.",
  );
});

test("guard blocks a user from changing their own is_active status", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("users cannot change account activity status."),
    true,
    "Guard must raise when a non-staff user attempts to change is_active.",
  );
});

test("guard allows a user to update their own safe profile fields", () => {
  const sql = guardSql();
  // After both role and is_active checks, the user-own branch returns new.
  const userBranch = sql.slice(
    sql.indexOf("if actor_id = old.id then"),
    sql.indexOf("raise exception 'profile update is not allowed."),
  );
  assert.equal(
    userBranch.includes("return new;"),
    true,
    "User own-profile branch must return new when role and is_active are unchanged.",
  );
});

// ── 8. Cross-user fallback ─────────────────────────────────────────────────
test("guard raises for any unmatched caller — no implicit allow path", () => {
  const sql = guardSql();
  assert.equal(
    sql.includes("raise exception 'profile update is not allowed.'"),
    true,
    "Guard must have an unconditional terminal raise so no branch falls through silently.",
  );
  // The terminal raise must be the last statement before end.
  const lastRaise = sql.lastIndexOf("raise exception 'profile update is not allowed.'");
  const endFunc   = sql.lastIndexOf("end;");
  assert.ok(lastRaise < endFunc, "Terminal raise must appear before the closing end;");
});

// ── 9. Trigger attachment ──────────────────────────────────────────────────
test("profiles_guard_update trigger is registered on the profiles table", () => {
  // The trigger definition lives in the original migration; the fix migration only
  // replaces the function body, not the trigger DDL.
  const original = read("supabase/migrations/20260410_phase_b_yaml_data_layer.sql").toLowerCase();
  assert.equal(
    original.includes("create trigger profiles_guard_update"),
    true,
    "BEFORE UPDATE trigger must be attached to public.profiles.",
  );
  assert.equal(original.includes("before update on public.profiles"), true);
  assert.equal(original.includes("execute procedure public.guard_profile_update()"), true);
});

// ── 10. Helper safety: current_user_role() must be SECURITY DEFINER ────────
test("current_user_role() is SECURITY DEFINER so it can read profiles without triggering RLS", () => {
  const sql = read("supabase/migrations/20260410_phase_b_yaml_data_layer.sql").toLowerCase();

  const fnStart = sql.indexOf("create or replace function public.current_user_role()");
  assert.notEqual(fnStart, -1, "current_user_role() must be defined.");

  const fnSnippet = sql.slice(fnStart, fnStart + 200);
  assert.equal(
    fnSnippet.includes("security definer"),
    true,
    "current_user_role() must be SECURITY DEFINER — without it, calling it from inside a profiles policy would recurse.",
  );
});

// ── 11. No profiles policy self-references profiles ────────────────────────
test("all profiles RLS policies use SECURITY DEFINER helpers, not inline profiles subqueries", () => {
  const sql = read(
    "supabase/migrations/20260605_reassert_profiles_policies_no_recursion.sql",
  ).toLowerCase();

  assert.equal(
    sql.includes("using (public.is_admin_user())"),
    true,
    "admin_full_profiles must delegate to is_admin_user() helper.",
  );
  assert.equal(
    sql.includes("using (public.can_access_target_user(id))"),
    true,
    "manager_profiles_select_manageable must delegate to can_access_target_user() helper.",
  );
  // Guard-query that fails the migration if any inline subquery on profiles survives.
  assert.equal(
    sql.includes("recursive profiles rls policy still present"),
    true,
    "Migration must include a do-block that aborts if a recursive policy is detected.",
  );
});

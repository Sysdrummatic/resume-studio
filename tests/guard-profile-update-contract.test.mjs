import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260714_profile_privileged_update_boundary.sql"
);

function migrationSql() {
  return fs.readFileSync(migrationPath, "utf8").toLowerCase();
}

function functionBody(sql, signature, nextSignature) {
  const start = sql.indexOf(signature);
  assert.notEqual(start, -1, `${signature} must exist`);
  const end = nextSignature ? sql.indexOf(nextSignature, start + signature.length) : sql.length;
  return sql.slice(start, end === -1 ? sql.length : end);
}

test("latest profile guard is invoker-safe and blocks service-role flag writes", () => {
  const guard = functionBody(
    migrationSql(),
    "create or replace function public.guard_profile_update()",
    "create or replace function public.set_user_role"
  );

  assert.equal(guard.includes("security invoker"), true);
  assert.equal(guard.includes("current_setting('request.jwt.claims', true)"), true);
  assert.equal(guard.includes("jwt_role = 'service_role'"), true);
  assert.equal(guard.includes("service role cannot modify privileged profile flags directly"), true);
  assert.equal(guard.includes("opencv.profile_privileged_update"), false);
});

test("direct profile UPDATE privilege is a five-column allowlist", () => {
  const sql = migrationSql();

  assert.equal(
    sql.includes("revoke update on table public.profiles from public, anon, authenticated, service_role;"),
    true
  );
  assert.match(
    sql.replace(/\s+/g, " "),
    /grant update \(display_name, first_name, last_name, avatar_url, bio\) on table public\.profiles to authenticated;/
  );
  assert.equal(sql.includes("grant update on table public.profiles to service_role;"), false);

  const grantStart = sql.indexOf("grant update (display_name");
  const grantEnd = sql.indexOf(";", grantStart);
  const grant = sql.slice(grantStart, grantEnd);
  const serviceGrant = sql.match(
    /grant update \(\s*(display_name[^;]*?)\)\s*on table public\.profiles to service_role;/
  )?.[1] ?? "";
  assert.equal(serviceGrant.includes("role"), true);
  assert.equal(serviceGrant.includes("is_active"), true);
  assert.equal(serviceGrant.includes("is_test_user"), false);
  assert.equal(serviceGrant.includes("is_ocv_staff"), false);
  for (const protectedColumn of [
    "role",
    "is_active",
    "is_test_user",
    "is_ocv_staff",
    "person_slug",
    "name_sync_mode",
    "updated_at"
  ]) {
    assert.equal(
      grant.includes(protectedColumn),
      false,
      `${protectedColumn} must not be directly writable`
    );
  }
});

test("safe direct updates are owner-only and unknown columns fail closed", () => {
  const guard = functionBody(
    migrationSql(),
    "create or replace function public.guard_profile_update()",
    "create or replace function public.set_user_role"
  );

  assert.equal(guard.includes("actor_id is null or actor_id <> old.id"), true);
  assert.equal(guard.includes("to_jsonb(new) - array["), true);
  assert.equal(guard.includes("profile update contains fields outside the safe allowlist"), true);
  assert.equal(guard.includes("if actor_role = 'admin' then\n    return new"), false);
  assert.equal(guard.includes("if actor_role = 'manager' then\n    return new"), false);
});

test("all four privileged fields require one approved RPC-owned change", () => {
  const guard = functionBody(
    migrationSql(),
    "create or replace function public.guard_profile_update()",
    "create or replace function public.set_user_role"
  );

  for (const field of ["new.role", "new.is_active", "new.is_test_user", "new.is_ocv_staff"]) {
    assert.equal(guard.includes(`${field} is distinct from old.${field.slice(4)}`), true);
  }
  for (const rpc of [
    "public.set_user_role(uuid,text)",
    "public.set_user_active(uuid,boolean)",
    "public.set_user_flag(uuid,text,boolean)"
  ]) {
    assert.equal(guard.includes(`to_regprocedure('${rpc}')`), true);
  }
  assert.equal(guard.includes("current_user = pg_get_userbyid(p.proowner)"), true);
  assert.equal(guard.includes("public.current_active_staff_role()"), true);
  assert.equal(guard.includes("privileged_field_groups > 1"), true);
  assert.equal(guard.includes("changed_flags > 1"), true);
  assert.equal(
    guard.includes("public.update_user_privileges(uuid,text,boolean,boolean,boolean)"),
    true
  );
});

test("privileged RPC execution is isolated behind an active-staff helper and a NOLOGIN owner", () => {
  const sql = migrationSql();

  assert.equal(sql.includes("create or replace function public.current_active_staff_role()"), true);
  assert.match(
    sql.replace(/\s+/g, " "),
    /where p\.id = public\.current_profile_actor_id\(\) and p\.is_active = true and p\.role in \('admin', 'manager'\)/
  );
  assert.equal(sql.includes("create or replace function public.current_profile_actor_id()"), true);
  assert.match(sql.replace(/\s+/g, " "), /create role profile_privileged_rpc_owner nologin/);
  assert.equal(sql.includes("alter role profile_privileged_rpc_owner"), false);
  for (const unsafeAttribute of [
    "role_state.rolcanlogin",
    "role_state.rolsuper",
    "role_state.rolcreatedb",
    "role_state.rolcreaterole",
    "role_state.rolinherit",
    "role_state.rolreplication",
    "role_state.rolbypassrls"
  ]) {
    assert.equal(sql.includes(unsafeAttribute), true);
  }
  assert.equal(sql.includes("profile_privileged_rpc_owner has unsafe attributes"), true);
  assert.equal(sql.includes("profile_privileged_rpc_owner has unexpected role memberships"), true);
  assert.equal(sql.includes("from pg_auth_members"), true);
  assert.equal(sql.includes("member_role.rolname <> 'postgres'"), true);
  assert.doesNotMatch(sql, /^\s*bypassrls\s*;?$/m);
  assert.equal(sql.includes("grant profile_privileged_rpc_owner to postgres;"), true);
  assert.equal(sql.includes("grant create on schema public to profile_privileged_rpc_owner;"), true);
  assert.equal(sql.includes("revoke create on schema public from profile_privileged_rpc_owner;"), true);
  assert.equal(sql.includes("grant usage on schema auth"), false);
  assert.equal(sql.includes("grant execute on function auth.uid()"), false);
  assert.equal(sql.includes("create policy profiles_privileged_rpc_owner_select"), true);
  assert.equal(sql.includes("create policy profiles_privileged_rpc_owner_update"), true);

  for (const signature of [
    "public.set_user_role(uuid, text)",
    "public.set_user_active(uuid, boolean)",
    "public.set_user_flag(uuid, text, boolean)",
    "public.update_user_privileges(uuid, text, boolean, boolean, boolean)"
  ]) {
    assert.equal(
      sql.includes(`alter function ${signature} owner to profile_privileged_rpc_owner;`),
      true
    );
  }
});

test("manager cannot change self or staff targets through privileged writes", () => {
  const sql = migrationSql();
  const guard = functionBody(
    sql,
    "create or replace function public.guard_profile_update()",
    "create or replace function public.set_user_role"
  );

  assert.equal(guard.includes("old.id = actor_id"), true);
  assert.equal(guard.includes("old.role not in ('user', 'recruiter')"), true);

  for (const message of [
    "manager cannot modify own role",
    "manager cannot modify own account status",
    "manager cannot modify own account flags",
    "manager can modify only user/recruiter"
  ]) {
    assert.equal(sql.includes(message), true);
  }
});

test("privileged RPCs are fixed-path, authenticated-only, and audited", () => {
  const sql = migrationSql();
  const roleRpc = functionBody(
    sql,
    "create or replace function public.set_user_role",
    "create or replace function public.set_user_active"
  );
  const activeRpc = functionBody(
    sql,
    "create or replace function public.set_user_active",
    "create or replace function public.set_user_flag"
  );
  const flagRpc = functionBody(
    sql,
    "create or replace function public.set_user_flag",
    "create or replace function public.update_user_privileges"
  );
  const atomicRpc = functionBody(
    sql,
    "create or replace function public.update_user_privileges",
    "grant usage on schema public"
  );

  for (const [body, updateColumn, action] of [
    [roleRpc, "set role =", "user.role_updated"],
    [activeRpc, "set is_active =", "user.status_updated"],
    [flagRpc, "set is_test_user =", "user.flag_updated"]
  ]) {
    assert.equal(body.includes("security definer"), true);
    assert.equal(body.includes("set search_path = pg_catalog, public"), true);
    assert.equal(body.includes("actor_role := public.current_active_staff_role()"), true);
    assert.equal(body.includes("for update"), true);
    assert.equal(body.includes(updateColumn), true);
    assert.equal(body.includes("perform public.log_admin_action("), true);
    assert.equal(body.includes(action), true);
  }

  assert.equal(flagRpc.includes("flag_name is null or flag_name not in"), true);
  assert.equal(atomicRpc.includes("for update"), true);
  assert.equal(atomicRpc.includes("set role = desired_role"), true);
  assert.equal(atomicRpc.includes("is_active = desired_active"), true);
  assert.equal(atomicRpc.includes("is_test_user = desired_test_user"), true);
  assert.equal(atomicRpc.includes("is_ocv_staff = desired_ocv_staff"), true);
  assert.equal(atomicRpc.includes("perform public.log_admin_action("), true);
  assert.equal(
    roleRpc.indexOf("perform public.log_admin_action(") < roleRpc.indexOf("update public.profiles"),
    true,
    "role audit must run before a possible admin self-demotion, in the same transaction"
  );

  for (const signature of [
    "set_user_role(uuid, text)",
    "set_user_active(uuid, boolean)",
    "set_user_flag(uuid, text, boolean)",
    "update_user_privileges(uuid, text, boolean, boolean, boolean)"
  ]) {
    assert.equal(
      sql.includes(`revoke execute on function public.${signature} from public, anon;`),
      true
    );
    assert.equal(sql.includes(`grant execute on function public.${signature} to authenticated;`), true);
    assert.equal(sql.includes(`revoke execute on function public.${signature} from service_role;`), true);
  }
});

test("service-role fast path runs before actor profile lookups", () => {
  const guard = functionBody(
    migrationSql(),
    "create or replace function public.guard_profile_update()",
    "create or replace function public.set_user_role"
  );
  const serviceBranch = guard.indexOf("if jwt_role = 'service_role'");
  const actorLookup = guard.indexOf("actor_role := public.current_active_staff_role()");

  assert.notEqual(serviceBranch, -1);
  assert.notEqual(actorLookup, -1);
  assert.equal(serviceBranch < actorLookup, true);
});

test("CI executes the live PostgREST security matrix against local Supabase", () => {
  const workflow = fs.readFileSync(
    path.join(process.cwd(), ".github", "workflows", "ci.yml"),
    "utf8"
  );

  assert.equal(workflow.includes("supabase/setup-cli@v2"), true);
  assert.equal(workflow.includes("supabase start"), true);
  assert.equal(workflow.includes("npm run test:rls"), true);
  assert.equal(workflow.includes("SUPABASE_RLS_TEST_URL"), true);
  assert.equal(workflow.includes("SUPABASE_RLS_TEST_SERVICE_ROLE_KEY"), true);
  assert.match(workflow, /set -a[\s\S]+eval "\$\(supabase status[\s\S]+set \+a[\s\S]+npm run test:rls/);
});

test("profiles guard trigger remains attached to every profile UPDATE", () => {
  const original = fs
    .readFileSync(
      path.join(process.cwd(), "supabase", "migrations", "20260410_phase_b_yaml_data_layer.sql"),
      "utf8"
    )
    .toLowerCase();

  assert.equal(original.includes("create trigger profiles_guard_update"), true);
  assert.equal(original.includes("before update on public.profiles"), true);
  assert.equal(original.includes("execute procedure public.guard_profile_update()"), true);
});

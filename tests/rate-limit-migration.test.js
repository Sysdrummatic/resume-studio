const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260825000000_distributed_rate_limiting.sql",
);
const grantFixPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260825010000_fix_rate_limit_execute_grants.sql",
);

function loadMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("rate_limit_counters table exists with RLS enabled and no client policies", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("create table if not exists public.rate_limit_counters"), true);
  assert.equal(sql.includes("alter table public.rate_limit_counters enable row level security"), true);
  // Deliberately no `create policy` for this table: RLS defaults to deny for
  // anon/authenticated, only the service role (which bypasses RLS) may touch it.
  assert.equal(/create policy/i.test(sql), false);
});

test("check_rate_limit is SECURITY DEFINER with a pinned search_path, executable only by service_role", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("create or replace function public.check_rate_limit("), true);
  assert.equal(sql.includes("security definer"), true);
  assert.equal(sql.includes("set search_path = public"), true);
  assert.equal(sql.includes("revoke all on function public.check_rate_limit(text, bigint, integer) from public"), true);
  assert.equal(sql.includes("grant execute on function public.check_rate_limit(text, bigint, integer) to service_role"), true);
});

test("check_rate_limit resolves the window atomically in a single upsert (no read-then-write race)", () => {
  const sql = loadMigration();

  assert.equal(sql.includes("on conflict (key) do update"), true);
  // Everything that decides the new count/reset must be inside the single
  // INSERT ... ON CONFLICT statement, not a separate SELECT beforehand.
  const upsertIndex = sql.indexOf("insert into public.rate_limit_counters");
  const returningIndex = sql.indexOf("returning t.count, t.reset_at");
  assert.ok(upsertIndex > -1 && returningIndex > upsertIndex);
});

test("the execute-grant fix explicitly revokes from anon and authenticated by name", () => {
  // Regression test for a live-verified bug: `revoke ... from public` only
  // revokes the implicit PUBLIC grant. Supabase's per-project default
  // privileges auto-grant EXECUTE on new public-schema functions to anon,
  // authenticated, and service_role by role name at creation time, so the
  // original migration's revoke-from-public left anon/authenticated with a
  // live RLS-bypass path into rate_limit_counters via the SECURITY DEFINER
  // function. Confirmed on prod via `set role anon; select check_rate_limit(...)`
  // before and after this fix.
  const sql = fs.readFileSync(grantFixPath, "utf8");

  assert.equal(
    sql.includes("revoke execute on function public.check_rate_limit(text, bigint, integer) from anon, authenticated, public"),
    true,
  );
  assert.equal(
    sql.includes("grant execute on function public.check_rate_limit(text, bigint, integer) to service_role"),
    true,
  );
});

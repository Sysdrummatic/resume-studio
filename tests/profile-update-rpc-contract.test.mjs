import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("profile API updates own profile through a narrow RPC instead of direct profiles RLS update", () => {
  const source = read("app/api/user/profile/route.ts");

  assert.equal(source.includes('functionName: "update_own_profile"'), true);
  assert.equal(source.includes('table: "profiles"'), false);
  assert.equal(source.includes("updateTable"), false);
});

test("profile update RPC is owner-scoped and allowlists editable profile fields", () => {
  const sql = read("supabase/migrations/20260603020000_zz_update_own_profile_rpc.sql").toLowerCase();

  assert.equal(sql.includes("create or replace function public.update_own_profile"), true);
  assert.equal(sql.includes("actor_id uuid := auth.uid()"), true);
  assert.equal(sql.includes("where p.id = actor_id"), true);
  assert.equal(sql.includes("name_sync_mode = case when input_updates ? 'firstname' or input_updates ? 'lastname' then 'manual'"), true);
  assert.equal(sql.includes("role ="), false);
  assert.equal(sql.includes("is_active ="), false);
});

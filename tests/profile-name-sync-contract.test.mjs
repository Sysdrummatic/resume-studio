import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("profile name sync migration adds structured name fields and sync mode", () => {
  const sql = read("supabase/migrations/20260603_z_profile_name_sync.sql").toLowerCase();

  assert.equal(sql.includes("add column if not exists first_name text"), true);
  assert.equal(sql.includes("add column if not exists last_name text"), true);
  assert.equal(sql.includes("add column if not exists name_sync_mode text not null default 'auto'"), true);
  assert.equal(sql.includes("check (name_sync_mode in ('auto', 'manual'))"), true);
});

test("profile name sync migration keeps person_slug updates explicit", () => {
  const sql = read("supabase/migrations/20260603_z_profile_name_sync.sql").toLowerCase();

  assert.equal(sql.includes("public.profile_compact_person_slug"), true);
  assert.equal(sql.includes("new.person_slug is distinct from old.person_slug"), true);
  assert.equal(sql.includes("old.person_slug is not null"), true);
  assert.equal(sql.includes("before insert or update of person_slug, display_name, first_name, last_name"), true);
});

test("profile name parser builds compact public slug from first and remaining name parts", () => {
  const source = read("app/lib/profile-name.ts");

  assert.equal(source.includes("const [firstName = \"\", ...rest]"), true);
  assert.equal(source.includes("lastName: rest.join(\" \")"), true);
  assert.equal(source.includes("replace(/[^a-z0-9]+/g, \"\")"), true);
});

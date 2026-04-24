const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const seedScriptPath = path.join(
  __dirname,
  "..",
  "supabase",
  "manual",
  "20260423_seed_staff_and_role_accounts.sql",
);

function loadSeedScript() {
  return fs.readFileSync(seedScriptPath, "utf8");
}

test("staff seed script does not create auth users with unknown random passwords", () => {
  const sql = loadSeedScript().toLowerCase();

  assert.equal(sql.includes("insert into auth.users"), false);
  assert.equal(sql.includes("insert into auth.identities"), false);
  assert.equal(sql.includes("crypt(gen_random_uuid()::text"), false);
});

test("staff seed script fails with clear message when required auth users are missing", () => {
  const sql = loadSeedScript().toLowerCase();

  assert.equal(
    sql.includes("missing auth.users rows for required staff emails"),
    true,
  );
  assert.equal(sql.includes("create these users with known passwords"), true);
});

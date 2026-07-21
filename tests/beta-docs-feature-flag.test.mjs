import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260719010000_beta_test_scenarios_flag.sql",
);

test("migration seeds beta_test_scenarios_visible enabled by default", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  assert.equal(source.includes("insert into public.platform_feature_flags"), true);
  assert.equal(source.includes("'beta_test_scenarios_visible', true"), true);
  assert.equal(source.includes("on conflict (key) do nothing"), true);
});

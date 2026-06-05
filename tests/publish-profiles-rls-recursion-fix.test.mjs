import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function normalize(source) {
  return source.replace(/\s+/g, " ");
}

test("buildHeaders makes the service role authoritative for the Authorization JWT", () => {
  const src = normalize(read("app/lib/supabase-http.ts"));

  // The Authorization token must be the service-role apikey when useServiceRole is set,
  // never a caller-supplied user accessToken (which would downgrade to `authenticated`
  // and re-enable profiles RLS -> infinite recursion during publish).
  assert.match(
    src,
    /const authToken = options\.useServiceRole \? apikey : options\.accessToken \|\| apikey;/,
    "Expected service-role requests to win the Authorization header.",
  );
  assert.match(src, /headers\.set\("Authorization", `Bearer \$\{authToken\}`\);/);

  // Guard against the original bug returning verbatim.
  assert.doesNotMatch(
    src,
    /headers\.set\("Authorization", `Bearer \$\{options\.accessToken \|\| apikey\}`\);/,
    "Authorization header must not fall back to a user token when service role is requested.",
  );
});

test("profile update helpers do not pass a user accessToken alongside service role", () => {
  const src = normalize(read("app/lib/resume-server.ts"));

  // refreshProfilePersonSlugForPublish UPDATE (the failing publish step) and the
  // updateProfileIdentity UPDATE must run purely as service role.
  assert.match(
    src,
    /table: "profiles", useServiceRole: true, query: `id=eq\.\$\{encodeURIComponent\(userId\)\}`, values: \{ person_slug: nextPersonSlug \},/,
    "person_slug publish UPDATE must not include accessToken.",
  );
  assert.match(
    src,
    /table: "profiles", useServiceRole: true, query: `id=eq\.\$\{encodeURIComponent\(userId\)\}`, values, \}\);/,
    "updateProfileIdentity UPDATE must not include accessToken.",
  );
});

test("guard_profile_update detects service_role via request.jwt.claims, not the deprecated GUC", () => {
  const sql = normalize(read(
    "supabase/migrations/20260605_fix_guard_profile_update_service_role.sql",
  ).toLowerCase());

  assert.equal(sql.includes("create or replace function public.guard_profile_update()"), true);
  // Must read the role from the modern claims JSON GUC (PostgREST v9+).
  assert.equal(sql.includes("current_setting('request.jwt.claims', true)"), true);
  assert.equal(sql.includes("->> 'role'"), true);
  // Service-role bypass must still be present.
  assert.equal(sql.includes("if jwt_role = 'service_role' then"), true);
  // Other guard rails must be preserved.
  assert.equal(sql.includes("users cannot change role."), true);
  assert.equal(sql.includes("profile update is not allowed."), true);
});

test("defensive migration re-asserts non-recursive profiles policies and guards against regressions", () => {
  const sql = normalize(read(
    "supabase/migrations/20260605_reassert_profiles_policies_no_recursion.sql",
  ).toLowerCase());

  assert.equal(sql.includes('drop policy if exists "admin_full_profiles" on public.profiles'), true);
  assert.equal(sql.includes("using (public.is_admin_user())"), true);
  assert.equal(sql.includes("using (public.can_access_target_user(id))"), true);
  // Self-reference guard that fails the migration if a recursive profiles policy survives.
  assert.equal(sql.includes("recursive profiles rls policy still present"), true);
});

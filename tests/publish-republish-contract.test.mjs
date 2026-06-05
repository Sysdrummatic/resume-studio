/**
 * Kontrakty dla publish → unpublish → republish CV Version.
 *
 * Testy statyczne — sprawdzają kod i SQL, nie wymagają bazy danych.
 * Uruchom: node tests/publish-republish-contract.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SQL — funkcja publish_resume_saved_version (wersja z reactivate)
// ─────────────────────────────────────────────────────────────────────────────

test("reactivate migration file exists", () => {
  assert.doesNotThrow(
    () => read("supabase/migrations/20260604_reactivate_revoked_public_link_on_publish.sql"),
    "Migration file 20260604 must exist",
  );
});

test("reactivate migration grants execute to authenticated", () => {
  const sql = read("supabase/migrations/20260604_reactivate_revoked_public_link_on_publish.sql").toLowerCase();
  assert.ok(
    sql.includes("grant execute on function public.publish_resume_saved_version"),
    "Migration must grant execute on publish_resume_saved_version to authenticated",
  );
});

test("reactivate migration: re-publish updates revoked row instead of inserting duplicate", () => {
  const sql = read("supabase/migrations/20260604_reactivate_revoked_public_link_on_publish.sql").toLowerCase();

  // Must look for a revoked link first (whitespace-agnostic check)
  assert.match(
    sql,
    /select\s+\*\s+into\s+revoked_link\s+from\s+public\.resume_public_links/,
    "Must select revoked_link before deciding to insert",
  );

  // Must UPDATE the existing revoked row (not INSERT a new one)
  assert.match(
    sql,
    /if revoked_link\.id is not null then\s+update public\.resume_public_links/,
    "Must UPDATE revoked row when found",
  );

  // INSERT only when no prior row exists
  assert.match(sql, /else\s+insert into public\.resume_public_links/, "INSERT only when no revoked link exists");
});

test("reactivate migration: revoked row is set to active and revoked_at cleared", () => {
  const sql = read("supabase/migrations/20260604_reactivate_revoked_public_link_on_publish.sql").toLowerCase();

  assert.ok(sql.includes("status = 'active'"), "Must set status = 'active'");
  assert.ok(sql.includes("revoked_at = null"), "Must clear revoked_at");
  assert.ok(sql.includes("is_active = true"), "Must set is_active = true");
});

test("reactivate migration: preserves public_id from revoked link for URL stability", () => {
  const sql = read("supabase/migrations/20260604_reactivate_revoked_public_link_on_publish.sql").toLowerCase();

  assert.match(
    sql,
    /resolved_public_id := coalesce\(revoked_link\.public_id/,
    "Must reuse public_id from revoked link",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SQL — unpublish ustawia is_public = false na presecie
// ─────────────────────────────────────────────────────────────────────────────

test("unpublish RPC sets resume_presets.is_public = false", () => {
  const sql = read("supabase/migrations/20260509_cv_publication_rpc_atomic.sql").toLowerCase();

  assert.ok(
    sql.includes("is_public = false"),
    "unpublish_resume_saved_version must set is_public = false on preset",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TypeScript — publishResumePreset nie filtruje po is_public
// ─────────────────────────────────────────────────────────────────────────────

test("fetchResumePresetById does not filter by is_public", () => {
  const server = read("app/lib/resume-server.ts");

  // Fetch musi znaleźć preset bez względu na is_public (wymagane do republish)
  const fetchFn = server.match(
    /async function fetchResumePresetById[\s\S]+?^}/m,
  )?.[0] ?? "";

  assert.ok(fetchFn.length > 0, "fetchResumePresetById must exist");
  assert.ok(
    !fetchFn.includes("is_public"),
    "fetchResumePresetById must NOT filter on is_public (unpublished presets must be re-publishable)",
  );
});

test("fetchProfileIdentity uses service role to avoid RLS recursion on profiles SELECT", () => {
  const server = read("app/lib/resume-server.ts");

  const fetchFn = server.match(
    /async function fetchProfileIdentity[\s\S]+?^}/m,
  )?.[0] ?? "";

  assert.ok(fetchFn.length > 0, "fetchProfileIdentity must exist");
  assert.ok(
    fetchFn.includes("useServiceRole: true"),
    "fetchProfileIdentity must use service role to bypass potential recursive RLS on profiles",
  );
  assert.ok(
    !fetchFn.includes("accessToken"),
    "fetchProfileIdentity must not use user accessToken after service-role fix",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. TypeScript — updateProfileIdentity używa service role (fix dla RLS recursion)
// ─────────────────────────────────────────────────────────────────────────────

test("updateProfileIdentity uses useServiceRole AND accessToken to bypass RLS while keeping auth context", () => {
  const server = read("app/lib/resume-server.ts");

  const fnMatch = server.match(
    /async function updateProfileIdentity[\s\S]+?^}/m,
  )?.[0] ?? "";

  assert.ok(fnMatch.length > 0, "updateProfileIdentity must exist");
  assert.ok(
    fnMatch.includes("useServiceRole: true"),
    "updateProfileIdentity must set useServiceRole:true so apikey bypasses RLS",
  );
  assert.ok(
    fnMatch.includes("accessToken"),
    "updateProfileIdentity must forward accessToken so auth.uid() is set for guard_profile_update trigger self-update check",
  );
});

test("updateProfileIdentity passes accessToken so guard_profile_update trigger allows self-update", () => {
  const server = read("app/lib/resume-server.ts");

  // Pattern: useServiceRole: true + accessToken in the same updateTable call
  assert.match(
    server,
    /updateTable\(\{[\s\S]{0,200}useServiceRole: true[\s\S]{0,200}accessToken/,
    "updateTable call in updateProfileIdentity must have both useServiceRole and accessToken",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TypeScript — publishResumePreset ma logi diagnostyczne na każdym return null
// ─────────────────────────────────────────────────────────────────────────────

test("publishResumePreset throws descriptive errors at each failure step", () => {
  const server = read("app/lib/resume-server.ts");

  const expectedSteps = [
    "[publish:step=fetchPreset]",
    "[publish:step=fetchDocument]",
    "[publish:step=syncProfile]",
    "[publish:step=refreshSlug]",
    "[publish:step=rpc]",
  ];

  for (const step of expectedSteps) {
    assert.ok(server.includes(step), `publishResumePreset must throw with label: ${step}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. TypeScript — route handler propaguje błąd RPC jako string (nie swallowuje)
// ─────────────────────────────────────────────────────────────────────────────

test("publish route propagates RPC exception message to client", () => {
  const route = read("app/api/resume/presets/[presetId]/publish/route.ts");

  // catch musi logować i zwracać oryginalny komunikat błędu
  assert.ok(route.includes("[publish-route-error]"), "Route must log [publish-route-error]");
  assert.ok(
    route.includes("error instanceof Error ? error.message"),
    "Route must propagate actual error message, not swallow it",
  );
});

test("publish route returns 200 with ok:true on success", () => {
  const route = read("app/api/resume/presets/[presetId]/publish/route.ts");
  assert.ok(route.includes("{ ok: true, preset }"), "Route must return ok:true with preset on success");
});

test("publish route returns 400 for missing selectedLocales", () => {
  const route = read("app/api/resume/presets/[presetId]/publish/route.ts");
  assert.ok(
    route.includes("At least one selected locale is required for publish."),
    "Route must reject missing locales with 400",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. SQL — RLS na resume_presets nie blokuje owner SELECT po unpublish
// ─────────────────────────────────────────────────────────────────────────────

test("resume_presets owner SELECT policy does not require is_public = true", () => {
  const sql = read("supabase/migrations/20260509_privacy_first_admin_access.sql").toLowerCase();

  // Polityka owner powinna używać tylko auth.uid() = user_id
  const ownerSelectMatch = sql.match(
    /create policy "resume_presets_select_owner"[\s\S]+?;/,
  )?.[0] ?? "";

  assert.ok(ownerSelectMatch.length > 0, "resume_presets_select_owner policy must exist");
  assert.ok(
    !ownerSelectMatch.includes("is_public"),
    "Owner SELECT policy must NOT require is_public=true — unpublished presets must be re-publishable",
  );
  assert.ok(
    ownerSelectMatch.includes("auth.uid() = user_id"),
    "Owner SELECT policy must use auth.uid() = user_id",
  );
});

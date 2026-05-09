import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("PR4 migration adds transactional publish/unpublish RPC functions", () => {
  const sql = read("supabase/migrations/20260509_cv_publication_rpc_atomic.sql").toLowerCase();

  assert.equal(sql.includes("create or replace function public.publish_resume_saved_version"), true);
  assert.equal(sql.includes("create or replace function public.unpublish_resume_saved_version"), true);
  assert.equal(sql.includes("security definer"), true);
  assert.equal(sql.includes("grant execute on function public.publish_resume_saved_version"), true);
  assert.equal(sql.includes("grant execute on function public.unpublish_resume_saved_version"), true);
});

test("PR4 publish RPC enforces explicit selected locales and default locale membership", () => {
  const sql = read("supabase/migrations/20260509_cv_publication_rpc_atomic.sql").toLowerCase();

  assert.equal(sql.includes("at least one selected locale is required for publish"), true);
  assert.equal(sql.includes("default locale must be included in selected locales"), true);
  assert.equal(sql.includes("resume_preset_variants"), true);
  assert.equal(sql.includes("resume_published_cv_locales"), true);
});

test("PR4 republish semantics keep active public-id and issue a new id only after unpublish", () => {
  const sql = read("supabase/migrations/20260509_cv_publication_rpc_atomic.sql").toLowerCase();

  assert.equal(sql.includes("if active_link.id is not null then"), true);
  assert.equal(sql.includes("update public.resume_public_links"), true);
  assert.equal(sql.includes("else"), true);
  assert.equal(sql.includes("insert into public.resume_public_links"), true);
  assert.equal(sql.includes("public_id,\n      active_published_cv_id"), true);
});

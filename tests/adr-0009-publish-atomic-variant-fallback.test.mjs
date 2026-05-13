import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0009 is accepted and implementation checklist is complete", () => {
  const adr = read("docs/adr/0009-publish-atomic-variant-fallback.md");
  assert.equal(adr.includes("Status") && adr.includes("Accepted"), true);
  assert.equal(adr.includes("- [x] Relax validation in `publish_resume_saved_version` RPC to allow missing variants."), true);
  assert.equal(adr.includes("- [x] Implement fallback logic to base selection in `resume_published_cv_locales` snapshot."), true);
  assert.equal(adr.includes("- [x] Propagate descriptive PostgreSQL exceptions through `publishResumePreset` and the API route."), true);
});

test("ADR 0009 implementation details in SQL migration", () => {
  const sql = read("supabase/migrations/20260510_fix_publish_rpc_variant_fallback.sql");
  
  // Verify Relax Validation (LEFT JOIN)
  assert.equal(sql.includes("left join public.resume_preset_variants rpv"), true);
  
  // Verify Fallback Logic (COALESCE)
  assert.equal(sql.includes("coalesce(rpv.selection, preset_row.selection)"), true);
});

test("ADR 0009 implementation details in server and API route", () => {
  const server = read("app/lib/resume-server.ts");
  const route = read("app/api/resume/presets/[presetId]/publish/route.ts");
  
  // Verify propagation in server
  assert.equal(server.includes("throw new Error(rpcResult.error || \"CV Version publish failed.\");"), true);
  
  // Verify propagation in API route
  assert.equal(route.includes("const message = error instanceof Error ? error.message : \"CV Version publish failed.\";"), true);
  assert.equal(route.includes("return NextResponse.json({ error: message }, { status: 500 });"), true);
});

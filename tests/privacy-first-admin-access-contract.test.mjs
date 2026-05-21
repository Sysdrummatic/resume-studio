import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0003 migration hardens content tables to owner-only RLS policies", () => {
  const sql = read("supabase/migrations/20260509_privacy_first_admin_access.sql");

  assert.equal(sql.includes("create policy \"resume_documents_select_owner\""), true);
  assert.equal(sql.includes("create policy \"resume_revisions_select_owner\""), true);
  assert.equal(sql.includes("create policy \"resume_presets_select_owner\""), true);
  assert.equal(sql.includes("create policy \"resume_preset_variants_select_owner\""), true);
  assert.equal(sql.includes("auth.uid() = user_id"), true);
  assert.equal(sql.includes("drop policy if exists \"resume_documents_select_public\""), true);
  assert.equal(sql.includes("drop policy if exists \"resume_presets_select_public\""), true);
});

test("ADR 0003 admin APIs expose metadata surface only", () => {
  const adminUsers = read("app/api/admin/users/route.ts");
  const adminUserItem = read("app/api/admin/users/[userId]/route.ts");

  assert.equal(adminUsers.includes("get_staff_user_overview"), true);
  assert.equal(adminUsers.includes("resume_documents"), false);
  assert.equal(adminUsers.includes("yaml_content"), false);
  assert.equal(adminUserItem.includes("anyCapability: \"admin.users.read\""), true);
  assert.equal(adminUserItem.includes("resume-server"), false);
});

test("ADR 0003 keeps recruiter separate from staff admin permissions", () => {
  const adminUsers = read("app/api/admin/users/route.ts");
  const adminUserItem = read("app/api/admin/users/[userId]/route.ts");

  assert.equal(adminUsers.includes("anyCapability: \"admin.users.read\""), true);
  assert.equal(adminUserItem.includes("anyCapability: \"admin.users.read\""), true);
  assert.equal(adminUsers.includes("requireRequestActor([\"admin\", \"manager\", \"recruiter\"])"), false);
  assert.equal(adminUserItem.includes("requireRequestActor([\"admin\", \"manager\", \"recruiter\"])"), false);
});

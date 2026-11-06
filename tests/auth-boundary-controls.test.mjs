import test from "node:test";
import ts from "typescript";
import assert from "node:assert/strict";
import fs from "node:fs";

import { DISPOSABLE_EMAIL_DOMAINS, isDisposableEmailAddress } from "../app/lib/disposable-email.ts";
import { getJwtAal, staffMfaBlocks } from "../app/lib/staff-mfa.ts";

const config = fs.readFileSync("supabase/config.toml", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261105000000_auth_boundary_controls.sql", "utf8");
const jwt = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

test("config.toml: confirmations, secure password change, TOTP, password length, hook", () => {
  assert.match(config, /\[auth\.email\][\s\S]*?enable_confirmations = true/);
  assert.match(config, /secure_password_change = true/);
  assert.match(config, /minimum_password_length = 10/);
  assert.match(config, /\[auth\.mfa\.totp\]\s+enroll_enabled = true\s+verify_enabled = true/);
  assert.match(config, /\n\[auth\.hook\.before_user_created\]\s+enabled = true\s+uri = "pg-functions:\/\/postgres\/public\/hook_before_user_created"/);
  assert.match(config, /\[auth\.sms\][\s\S]*?enable_confirmations = false/); // sms signup stays off
  assert.match(config, /enable_refresh_token_rotation = true/);
});

test("hook migration: definer + pinned search_path, only supabase_auth_admin may execute, RLS on table", () => {
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /revoke all on function public\.hook_before_user_created\(jsonb\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.hook_before_user_created\(jsonb\) to supabase_auth_admin/);
  assert.match(migration, /alter table public\.disposable_email_domains enable row level security/);
  assert.equal(/create policy/i.test(migration), false);
  assert.match(migration, /'staff_mfa_required', false/);
  assert.match(migration, /'http_code', 400/);
});

test("TS and SQL disposable lists are identical", () => {
  const sql = [...migration.matchAll(/\('([a-z0-9.-]+)'\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(sql, [...DISPOSABLE_EMAIL_DOMAINS].sort());
});

test("disposable check is local: blocks listed domains and subdomains, never calls the network", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("network call"); };
  try {
    assert.equal(await isDisposableEmailAddress("a@mailinator.com"), true);
    assert.equal(await isDisposableEmailAddress("A@MailInator.COM"), true);
    assert.equal(await isDisposableEmailAddress("a@x.y.yopmail.com"), true);
    assert.equal(await isDisposableEmailAddress("a@notmailinator.com"), false);
    assert.equal(await isDisposableEmailAddress("a@gmail.com"), false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("no Disify / external disposable lookup remains in app code", () => {
  const src = fs.readFileSync("app/lib/disposable-email.ts", "utf8") + fs.readFileSync("app/api/auth/signup/route.ts", "utf8");
  assert.equal(/disify.com|DISPOSABLE_EMAIL_CHECK_URL|fetch\(/i.test(src), false);
});

test("AAL1 vs AAL2: staff blocked at AAL1 only when required", () => {
  const aal1 = jwt({ aal: "aal1" });
  const aal2 = jwt({ aal: "aal2" });
  assert.equal(staffMfaBlocks({ isStaff: true, required: true, accessToken: aal1 }), true);
  assert.equal(staffMfaBlocks({ isStaff: true, required: true, accessToken: aal2 }), false);
  assert.equal(staffMfaBlocks({ isStaff: true, required: false, accessToken: aal1 }), false);
  assert.equal(staffMfaBlocks({ isStaff: false, required: true, accessToken: aal1 }), false);
});

test("malformed, unsigned-claim or missing aal never counts as AAL2", () => {
  for (const token of ["", "garbage", "a.b.c", jwt({}), jwt({ aal: 2 }), jwt({ aal: "AAL2" })]) {
    assert.notEqual(getJwtAal(token), "aal2", token);
    assert.equal(staffMfaBlocks({ isStaff: true, required: true, accessToken: token }), true, token);
  }
});

test("requireRequestActor enforces the staff AAL2 rule with a stable code", () => {
  const actor = fs.readFileSync("app/lib/auth-request.ts", "utf8");
  assert.match(actor, /staffMfaBlocks\(/);
  assert.match(actor, /code: "mfa_required"/);
});

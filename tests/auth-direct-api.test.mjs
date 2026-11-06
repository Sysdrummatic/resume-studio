// Direct Supabase Auth API checks: the public /auth/v1/signup endpoint must enforce policy on its own.
// Opt-in (hits a real project, use the TEST project only):
//   AUTH_DIRECT_TESTS=1 node --use-system-ca --env-file=.env.local --test tests/auth-direct-api.test.mjs
// AUTH_DIRECT_EXPECT_HOOK=1 additionally asserts the before_user_created hook rejects a disposable domain
// (only set once the hook is enabled on that project, otherwise the call would create an account).
import test from "node:test";
import assert from "node:assert/strict";

const run = process.env.AUTH_DIRECT_TESTS === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const skip = !run || !url || !key ? "set AUTH_DIRECT_TESTS=1 and Supabase env" : false;

const signup = (email, password) =>
  fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

test("direct signup with a too-short password is rejected", { skip }, async () => {
  const res = await signup(`direct-api-check+${Date.now()}@example.com`, "short1");
  assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}`);
});

test("direct signup with a disposable domain is rejected by the hook", { skip: skip || process.env.AUTH_DIRECT_EXPECT_HOOK !== "1" && "hook not confirmed enabled" }, async () => {
  const res = await signup(`direct-api-check+${Date.now()}@mailinator.com`, "a-long-enough-password-1");
  assert.equal(res.status, 400);
});

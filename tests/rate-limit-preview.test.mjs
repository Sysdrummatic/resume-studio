// Opt-in abuse test against a deployed preview (distributed limiter across real function instances):
//   RATE_LIMIT_PREVIEW_URL=https://deploy-preview-N--opencivera.netlify.app node --use-system-ca --test tests/rate-limit-preview.test.mjs
// Uses /api/auth/update-password with an invalid token (limit 10 / 15 min / IP): harmless 400s, then 429.
// Re-run needs a fresh window (15 min) or another client IP.
import test from "node:test";
import assert from "node:assert/strict";

const base = process.env.RATE_LIMIT_PREVIEW_URL?.replace(/\/$/, "");
const skip = base ? false : "set RATE_LIMIT_PREVIEW_URL to a deploy preview";

const hit = (headers = {}) =>
  fetch(`${base}/api/auth/update-password`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ accessToken: "invalid", password: "a-long-enough-password-1" }),
  });

test("limit holds across instances and ignores spoofed x-forwarded-for", { skip }, async () => {
  const statuses = [];
  for (let i = 0; i < 14; i++) {
    // a rotating spoofed header must not reset or dodge the bucket
    const res = await hit({ "x-forwarded-for": `203.0.113.${i + 1}` });
    statuses.push(res.status);
    if (res.status === 429) {
      assert.ok(Number(res.headers.get("retry-after")) >= 1);
      assert.equal((await res.json()).code, "rate_limited");
    }
  }
  assert.ok(statuses.includes(429), `never rate limited: ${statuses}`);
  assert.ok(statuses.indexOf(429) <= 11, `limited too late: ${statuses}`);
});

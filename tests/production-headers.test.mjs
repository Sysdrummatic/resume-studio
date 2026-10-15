import test from "node:test";
import assert from "node:assert/strict";

// Live check against production; skipped in `npm test` (which must stay offline).
// Run with: npm run test:production (--env-file sets the flag; --use-system-ca trusts corporate TLS inspection roots)
const RUN_LIVE = process.env.PRODUCTION_HEADERS_TEST === "1";
const ORIGIN = process.env.PRODUCTION_ORIGIN ?? "https://opencivera.com";
const ONE_YEAR = 31536000;

async function head(url) {
  return fetch(url, { method: "HEAD", redirect: "manual" });
}

test(
  "production serves HSTS of at least one year on apex and www",
  { skip: !RUN_LIVE, timeout: 30000 },
  async () => {
    const www = new URL(ORIGIN);
    www.hostname = `www.${www.hostname}`;
    for (const url of [ORIGIN, www.origin]) {
      const response = await head(url);
      const hsts = response.headers.get("strict-transport-security") ?? "";
      const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
      assert.ok(maxAge >= ONE_YEAR, `${url}: expected HSTS max-age >= ${ONE_YEAR}, got "${hsts}"`);
    }
  },
);

test(
  "production redirects http and www to the https apex",
  { skip: !RUN_LIVE, timeout: 30000 },
  async () => {
    const apex = new URL(ORIGIN);
    const www = new URL(ORIGIN);
    www.hostname = `www.${apex.hostname}`;
    const http = new URL(ORIGIN);
    http.protocol = "http:";
    for (const url of [http.origin, www.origin]) {
      const response = await head(url);
      assert.equal(response.status, 301, `${url} should answer 301`);
      assert.equal(new URL(response.headers.get("location"), url).origin, apex.origin, `${url} should redirect to ${apex.origin}`);
    }
  },
);

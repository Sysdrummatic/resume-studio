import test from "node:test";
import assert from "node:assert/strict";

import { getAppBaseUrl } from "../app/lib/env.ts";
import nextConfig from "../next.config.ts";

function withEnv(values, run) {
  const saved = {};
  for (const key of Object.keys(values)) saved[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const NO_BASE = { NEXT_PUBLIC_APP_BASE_URL: undefined, URL: undefined };

test("production without a base URL fails instead of falling back to localhost", () => {
  withEnv({ ...NO_BASE, NODE_ENV: "production" }, () => {
    assert.throws(() => getAppBaseUrl(), /NEXT_PUBLIC_APP_BASE_URL/);
  });
});

test("development without a base URL falls back to localhost", () => {
  withEnv({ ...NO_BASE, NODE_ENV: "development" }, () => {
    assert.equal(getAppBaseUrl(), "http://localhost:3000");
  });
});

test("production requires https and normalizes the origin", () => {
  withEnv({ ...NO_BASE, NODE_ENV: "production", NEXT_PUBLIC_APP_BASE_URL: "http://opencivera.com" }, () => {
    assert.throws(() => getAppBaseUrl(), /https/);
  });
  withEnv({ ...NO_BASE, NODE_ENV: "production", NEXT_PUBLIC_APP_BASE_URL: "https://opencivera.com/" }, () => {
    assert.equal(getAppBaseUrl(), "https://opencivera.com");
  });
});

test("Netlify URL is used when the explicit variable is unset", () => {
  withEnv({ ...NO_BASE, NODE_ENV: "production", URL: "https://deploy.netlify.app" }, () => {
    assert.equal(getAppBaseUrl(), "https://deploy.netlify.app");
  });
});

test("next.config sets baseline security headers on every route", async () => {
  const rules = await nextConfig.headers();
  const all = rules.find((rule) => rule.source === "/:path*");
  const byKey = Object.fromEntries(all.headers.map((h) => [h.key, h.value]));
  assert.equal(byKey["Strict-Transport-Security"], undefined, "HSTS is served by Netlify; do not lower it from the app");
  assert.equal(byKey["X-Content-Type-Options"], "nosniff");
  assert.ok(byKey["Referrer-Policy"]);
  assert.ok(byKey["Permissions-Policy"]);
});

test("fonts and animations are cached immutably", async () => {
  const rules = await nextConfig.headers();
  for (const source of ["/fonts/:path*", "/animations/:path*"]) {
    const rule = rules.find((r) => r.source === source);
    assert.match(rule.headers[0].value, /immutable/);
  }
});

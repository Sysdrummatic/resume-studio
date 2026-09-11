import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SMOKE_CHECKS,
  assessSmokeObservation,
  formatFailedRequest,
  parsePreviewSmokeArgs,
} from "../scripts/qa/preview-smoke.mjs";

test("preview smoke requires an explicit safe HTTP(S) base URL", () => {
  assert.deepEqual(parsePreviewSmokeArgs(["--base=https://deploy-preview-155.example.net/"]), {
    baseUrl: "https://deploy-preview-155.example.net",
    outputDir: undefined,
  });
  assert.deepEqual(parsePreviewSmokeArgs([], { PREVIEW_URL: "http://127.0.0.1:3100/" }), {
    baseUrl: "http://127.0.0.1:3100",
    outputDir: undefined,
  });
  assert.throws(() => parsePreviewSmokeArgs([]), /--base or PREVIEW_URL/);
  assert.throws(() => parsePreviewSmokeArgs(["--base=javascript:alert(1)"]), /HTTP or HTTPS/);
  assert.throws(() => parsePreviewSmokeArgs(["--base=https://user:secret@example.net"]), /credentials/);
});

test("aborted Next.js link prefetch does not hide real same-origin asset failures", () => {
  const origin = "https://preview.example.net";
  assert.equal(
    formatFailedRequest(
      { url: `${origin}/login`, method: "GET", resourceType: "fetch", errorText: "net::ERR_ABORTED" },
      origin,
    ),
    null,
  );
  assert.equal(
    formatFailedRequest(
      { url: `${origin}/_next/static/chunk.js`, method: "GET", resourceType: "script", errorText: "net::ERR_FAILED" },
      origin,
    ),
    "GET /_next/static/chunk.js: net::ERR_FAILED",
  );
  assert.equal(
    formatFailedRequest(
      { url: "https://third-party.example/script.js", method: "GET", resourceType: "script", errorText: "net::ERR_FAILED" },
      origin,
    ),
    null,
  );
});

test("default plan covers public availability and anonymous protected-route redirects", () => {
  assert.deepEqual(
    DEFAULT_SMOKE_CHECKS.map(({ path, expectedPath, expectedReason }) => ({ path, expectedPath, expectedReason })),
    [
      { path: "/", expectedPath: "/", expectedReason: undefined },
      { path: "/login", expectedPath: "/login", expectedReason: undefined },
      { path: "/privacy", expectedPath: "/privacy", expectedReason: undefined },
      { path: "/terms", expectedPath: "/terms", expectedReason: undefined },
      { path: "/resume", expectedPath: "/resume", expectedReason: undefined },
      { path: "/dashboard", expectedPath: "/login", expectedReason: "signed-out" },
      { path: "/master-resume", expectedPath: "/login", expectedReason: "signed-out" },
      { path: "/admin", expectedPath: "/login", expectedReason: "signed-out" },
    ],
  );
});

test("smoke observation reports HTTP, redirect, browser, console and request failures", () => {
  const check = { path: "/dashboard", expectedPath: "/login", expectedReason: "signed-out" };
  const passing = assessSmokeObservation(check, {
    status: 200,
    finalUrl: "https://preview.example.net/login?reason=signed-out",
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    serverErrors: [],
  });
  assert.deepEqual(passing, []);

  const failures = assessSmokeObservation(check, {
    status: 503,
    finalUrl: "https://preview.example.net/dashboard",
    pageErrors: ["Hydration failed"],
    consoleErrors: ["Unhandled error"],
    failedRequests: ["GET /_next/static/chunk.js: net::ERR_FAILED"],
    serverErrors: ["500 GET /api/auth/session"],
  });
  assert.deepEqual(failures, [
    "expected HTTP 200, received 503",
    "expected final path /login, received /dashboard",
    "expected reason=signed-out, received no reason",
    "page error: Hydration failed",
    "console error: Unhandled error",
    "request failed: GET /_next/static/chunk.js: net::ERR_FAILED",
    "server error: 500 GET /api/auth/session",
  ]);
});

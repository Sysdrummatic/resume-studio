import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_SMOKE_CHECKS,
  assessSmokeObservation,
  formatFailedRequest,
  isIgnoredConsoleError,
  parsePreviewSmokeArgs,
  runPreviewSmoke
} from "../scripts/qa/preview-smoke.mjs";

test("preview smoke requires an explicit safe HTTP(S) base URL", () => {
  assert.deepEqual(parsePreviewSmokeArgs(["--base=https://deploy-preview-155.example.net/"]), {
    baseUrl: "https://deploy-preview-155.example.net",
    outputDir: undefined
  });
  assert.deepEqual(parsePreviewSmokeArgs([], { PREVIEW_URL: "http://127.0.0.1:3100/" }), {
    baseUrl: "http://127.0.0.1:3100",
    outputDir: undefined
  });
  assert.throws(() => parsePreviewSmokeArgs([]), /--base or PREVIEW_URL/);
  assert.throws(() => parsePreviewSmokeArgs(["--base=javascript:alert(1)"]), /HTTP or HTTPS/);
  assert.throws(
    () => parsePreviewSmokeArgs(["--base=https://user:secret@example.net"]),
    /credentials/
  );
});

function stubBrowserType({ destination, failNavigation, failScreenshot } = {}) {
  return {
    launch: async () => ({
      newContext: async () => ({
        newPage: async () => {
          let currentUrl = "about:blank";
          return {
            on() {},
            async goto(url) {
              if (failNavigation?.(url)) throw new Error("net::ERR_CONNECTION_REFUSED");
              currentUrl = destination || url;
              return { status: () => 200 };
            },
            url: () => currentUrl,
            waitForTimeout: async () => {},
            async screenshot() {
              if (failScreenshot?.(currentUrl)) throw new Error("Screenshot failed");
            },
            close: async () => {}
          };
        }
      }),
      close: async () => {}
    })
  };
}

async function smokeOutputDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "opencivera-preview-smoke-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("smoke rejects redirects to another deployment with the same route", async (t) => {
  const outputDir = await smokeOutputDirectory(t);
  const report = await runPreviewSmoke({
    baseUrl: "https://preview.example.net",
    outputDir,
    browserType: stubBrowserType({ destination: "https://production.example.net/login" }),
    checks: [{ path: "/login", expectedPath: "/login" }]
  });

  assert.equal(report.passed, false);
  assert.match(report.results[0].issues.join("\n"), /expected origin https:\/\/preview.example.net/);
});

for (const failure of ["navigation", "screenshot"]) {
  test(`smoke reports ${failure} failures, continues routes and replaces a previous PASS`, async (t) => {
    const outputDir = await smokeOutputDirectory(t);
    const reportPath = path.join(outputDir, "report.json");
    await writeFile(reportPath, JSON.stringify({ passed: true, results: [] }));
    const failsOnLogin = (url) => new URL(url).pathname === "/login";
    const report = await runPreviewSmoke({
      baseUrl: "https://preview.example.net",
      outputDir,
      browserType: stubBrowserType(
        failure === "navigation"
          ? { failNavigation: failsOnLogin }
          : { failScreenshot: failsOnLogin }
      ),
      checks: [
        { path: "/login", expectedPath: "/login" },
        { path: "/privacy", expectedPath: "/privacy" }
      ]
    });

    assert.equal(report.passed, false);
    assert.equal(report.results.length, 2);
    assert.match(
      report.results[0].issues.join("\n"),
      failure === "navigation" ? /ERR_CONNECTION_REFUSED/ : /Screenshot failed/
    );
    assert.deepEqual(report.results[1].issues, []);
    assert.deepEqual(JSON.parse(await readFile(reportPath, "utf8")), report);
  });
}

test("smoke removes a previous PASS before attempting to launch the browser", async (t) => {
  const outputDir = await smokeOutputDirectory(t);
  const reportPath = path.join(outputDir, "report.json");
  await writeFile(reportPath, JSON.stringify({ passed: true, results: [] }));

  await assert.rejects(
    runPreviewSmoke({
      baseUrl: "https://preview.example.net",
      outputDir,
      browserType: { launch: async () => { throw new Error("Browser launch failed"); } }
    }),
    /Browser launch failed/
  );
  await assert.rejects(access(reportPath), { code: "ENOENT" });
});

test("aborted Next.js link prefetch does not hide real same-origin asset failures", () => {
  const origin = "https://preview.example.net";
  assert.equal(
    formatFailedRequest(
      {
        url: `${origin}/login`,
        method: "GET",
        resourceType: "fetch",
        errorText: "net::ERR_ABORTED"
      },
      origin
    ),
    null
  );
  assert.equal(
    formatFailedRequest(
      {
        url: `${origin}/_next/static/chunk.js`,
        method: "GET",
        resourceType: "script",
        errorText: "net::ERR_FAILED"
      },
      origin
    ),
    "GET /_next/static/chunk.js: net::ERR_FAILED"
  );
  assert.equal(
    formatFailedRequest(
      {
        url: "https://third-party.example/script.js",
        method: "GET",
        resourceType: "script",
        errorText: "net::ERR_FAILED"
      },
      origin
    ),
    null
  );
});

test("Netlify preview tooling blocked by app CSP does not hide app failures", () => {
  const origin = "https://deploy-preview-156--opencivera.netlify.app";
  assert.equal(
    formatFailedRequest(
      {
        url: `${origin}/.netlify/scripts/cdp`,
        method: "GET",
        resourceType: "script",
        errorText: "csp"
      },
      origin
    ),
    null
  );
  assert.equal(
    formatFailedRequest(
      {
        url: `${origin}/_next/static/app.js`,
        method: "GET",
        resourceType: "script",
        errorText: "csp"
      },
      origin
    ),
    "GET /_next/static/app.js: csp"
  );
  assert.equal(
    isIgnoredConsoleError(
      `Loading the script '${origin}/.netlify/scripts/cdp' violates the following Content Security Policy directive`
    ),
    true
  );
  assert.equal(isIgnoredConsoleError("Hydration failed"), false);
});

test("default plan covers public availability and anonymous protected-route redirects", () => {
  assert.deepEqual(
    DEFAULT_SMOKE_CHECKS.map(({ path, expectedPath, expectedReason }) => ({
      path,
      expectedPath,
      expectedReason
    })),
    [
      { path: "/", expectedPath: "/", expectedReason: undefined },
      { path: "/login", expectedPath: "/login", expectedReason: undefined },
      { path: "/privacy", expectedPath: "/privacy", expectedReason: undefined },
      { path: "/terms", expectedPath: "/terms", expectedReason: undefined },
      { path: "/resume", expectedPath: "/resume", expectedReason: undefined },
      { path: "/dashboard", expectedPath: "/login", expectedReason: "signed-out" },
      { path: "/master-resume", expectedPath: "/login", expectedReason: "signed-out" },
      { path: "/admin", expectedPath: "/login", expectedReason: "signed-out" }
    ]
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
    serverErrors: []
  }, "https://preview.example.net");
  assert.deepEqual(passing, []);

  const failures = assessSmokeObservation(check, {
    status: 503,
    finalUrl: "https://preview.example.net/dashboard",
    pageErrors: ["Hydration failed"],
    consoleErrors: ["Unhandled error"],
    failedRequests: ["GET /_next/static/chunk.js: net::ERR_FAILED"],
    serverErrors: ["500 GET /api/auth/session"]
  }, "https://preview.example.net");
  assert.deepEqual(failures, [
    "expected HTTP 200, received 503",
    "expected final path /login, received /dashboard",
    "expected reason=signed-out, received no reason",
    "page error: Hydration failed",
    "console error: Unhandled error",
    "request failed: GET /_next/static/chunk.js: net::ERR_FAILED",
    "server error: 500 GET /api/auth/session"
  ]);
});

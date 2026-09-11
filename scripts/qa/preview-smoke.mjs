#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const DEFAULT_SMOKE_CHECKS = Object.freeze([
  { path: "/", expectedPath: "/" },
  { path: "/login", expectedPath: "/login" },
  { path: "/privacy", expectedPath: "/privacy" },
  { path: "/terms", expectedPath: "/terms" },
  { path: "/resume", expectedPath: "/resume" },
  { path: "/dashboard", expectedPath: "/login", expectedReason: "signed-out" },
  { path: "/master-resume", expectedPath: "/login", expectedReason: "signed-out" },
  { path: "/admin", expectedPath: "/login", expectedReason: "signed-out" }
]);

function normalizeBaseUrl(value) {
  if (!value) throw new Error("Provide --base or PREVIEW_URL.");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Preview URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password) throw new Error("Preview URL must not contain credentials.");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      "Preview URL must point to the deployment root without a path, query, or fragment."
    );
  }
  return url.origin;
}

export function parsePreviewSmokeArgs(argv, env = process.env) {
  let base = env.PREVIEW_URL;
  let outputDir;
  for (const argument of argv) {
    if (argument.startsWith("--base=")) base = argument.slice("--base=".length);
    else if (argument.startsWith("--output=")) outputDir = argument.slice("--output=".length);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return { baseUrl: normalizeBaseUrl(base), outputDir: outputDir || undefined };
}

export function assessSmokeObservation(check, observation) {
  const issues = [];
  if (observation.status !== 200)
    issues.push(`expected HTTP 200, received ${observation.status ?? "no response"}`);
  const finalUrl = new URL(observation.finalUrl);
  if (finalUrl.pathname !== check.expectedPath) {
    issues.push(`expected final path ${check.expectedPath}, received ${finalUrl.pathname}`);
  }
  if (check.expectedReason && finalUrl.searchParams.get("reason") !== check.expectedReason) {
    issues.push(
      `expected reason=${check.expectedReason}, received ${finalUrl.searchParams.get("reason") ? `reason=${finalUrl.searchParams.get("reason")}` : "no reason"}`
    );
  }
  issues.push(...observation.pageErrors.map((message) => `page error: ${message}`));
  issues.push(...observation.consoleErrors.map((message) => `console error: ${message}`));
  issues.push(...observation.failedRequests.map((message) => `request failed: ${message}`));
  issues.push(...observation.serverErrors.map((message) => `server error: ${message}`));
  return issues;
}

export function formatFailedRequest(request, baseOrigin) {
  const url = new URL(request.url);
  if (url.origin !== baseOrigin) return null;
  if (url.pathname === "/.netlify/scripts/cdp" && request.errorText === "csp") return null;
  if (request.resourceType === "fetch" && request.errorText === "net::ERR_ABORTED") return null;
  return `${request.method} ${url.pathname}: ${request.errorText || "unknown failure"}`;
}

export function isIgnoredConsoleError(message) {
  return message.includes("/.netlify/scripts/cdp") && message.includes("Content Security Policy");
}

function safeScreenshotName(routePath) {
  return routePath === "/" ? "home" : routePath.slice(1).replace(/[^a-z0-9]+/gi, "-");
}

async function observeRoute(context, baseUrl, check, outputDir) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const serverErrors = [];
  const baseOrigin = new URL(baseUrl).origin;

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !isIgnoredConsoleError(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    const message = formatFailedRequest(
      {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        errorText: request.failure()?.errorText
      },
      baseOrigin
    );
    if (message) failedRequests.push(message);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === baseOrigin && response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
    }
  });

  try {
    const response = await page.goto(new URL(check.path, baseUrl).toString(), {
      waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(outputDir, `${safeScreenshotName(check.path)}.png`),
      fullPage: true
    });
    return {
      status: response?.status(),
      finalUrl: page.url(),
      pageErrors,
      consoleErrors,
      failedRequests,
      serverErrors
    };
  } finally {
    await page.close();
  }
}

export async function runPreviewSmoke({
  baseUrl,
  outputDir,
  browserType = chromium,
  checks = DEFAULT_SMOKE_CHECKS
}) {
  const resolvedOutput = path.resolve(outputDir || path.join("tmp", "preview-smoke"));
  await mkdir(resolvedOutput, { recursive: true });
  const browser = await browserType.launch({ headless: true });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    for (const check of checks) {
      const observation = await observeRoute(context, baseUrl, check, resolvedOutput);
      results.push({
        path: check.path,
        finalUrl: observation.finalUrl,
        issues: assessSmokeObservation(check, observation)
      });
    }
  } finally {
    await browser.close();
  }

  const report = {
    baseUrl,
    passed: results.every((result) => result.issues.length === 0),
    results
  };
  await writeFile(
    path.join(resolvedOutput, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  return report;
}

async function main() {
  const options = parsePreviewSmokeArgs(process.argv.slice(2));
  const report = await runPreviewSmoke(options);
  for (const result of report.results) {
    console.log(`${result.issues.length ? "FAIL" : "PASS"} ${result.path} -> ${result.finalUrl}`);
    for (const issue of result.issues) console.error(`  ${issue}`);
  }
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

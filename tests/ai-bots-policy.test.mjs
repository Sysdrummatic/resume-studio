import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  AI_BOT_USER_AGENTS,
  aiBotForbiddenResponse,
  isAiBotBlockedPath,
  isAiBotUserAgent,
  shouldBlockAiBot,
} from "../app/lib/ai-bots.ts";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("every listed AI bot UA is recognised, browsers and link previews are not", () => {
  for (const token of AI_BOT_USER_AGENTS) {
    assert.equal(isAiBotUserAgent(`Mozilla/5.0 (compatible; ${token}/1.0; +https://x.example)`), true, token);
  }
  assert.equal(isAiBotUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126 Safari/537.36"), false);
  assert.equal(isAiBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), false);
  assert.equal(isAiBotUserAgent("LinkedInBot/1.0 (compatible; Mozilla/5.0)"), false);
  assert.equal(isAiBotUserAgent("Slackbot-LinkExpanding 1.0"), false);
  assert.equal(isAiBotUserAgent(null), false);
});

test("blocked paths: CVs, exports and v1 API; not marketing, docs or app routes", () => {
  for (const p of ["/jan-kowalski/abc123", "/api/resume/export/pdf", "/api/public/opencv/v1/jan/abc123"]) {
    assert.equal(isAiBotBlockedPath(p), true, p);
  }
  for (const p of ["/", "/resume", "/docs", "/docs/tutorials", "/privacy", "/terms", "/login", "/robots.txt", "/dashboard/x"]) {
    assert.equal(isAiBotBlockedPath(p), false, p);
  }
  assert.equal(shouldBlockAiBot("GPTBot/1.2", "/jan/abc"), true);
  assert.equal(shouldBlockAiBot("GPTBot/1.2", "/docs"), false);
  assert.equal(shouldBlockAiBot("Mozilla/5.0 Chrome/126", "/jan/abc"), false);
});

test("403 is uncacheable, varies by User-Agent and is noindex", () => {
  const res = aiBotForbiddenResponse();
  assert.equal(res.status, 403);
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  assert.match(res.headers.get("vary") ?? "", /User-Agent/i);
  assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
});

test("robots.txt carries the per-bot allowlist and never disallows Googlebot", () => {
  const robots = read("app/robots.ts");
  assert.ok(robots.includes("AI_BOT_USER_AGENTS") && robots.includes("AI_BOT_ALLOWED_PATHS"));
  assert.ok(robots.includes('disallow: "/"'));
  assert.equal(robots.toLowerCase().includes("googlebot"), false);
});
test("proxy blocks before session work and matcher covers machine surfaces; exports send noindex", () => {
  const proxy = read("proxy.ts");
  assert.ok(proxy.indexOf("shouldBlockAiBot") < proxy.indexOf("readAuthTokens(request.cookies)"));
  assert.ok(proxy.includes("Content-Security-Policy"));
  assert.ok(proxy.includes('"/api/resume/export/:path*"'));
  assert.ok(proxy.includes('"/api/public/opencv/v1/:path*"'));
  const cfg = read("next.config.ts");
  assert.ok(cfg.includes("X-Robots-Tag") && cfg.includes("/api/resume/export/:path*") && cfg.includes("/api/public/opencv/v1/:path*"));
  assert.ok(read("docs/adr/0008-opencv-public-api-and-export-surface.md").includes("/v2/"));
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  AI_BOT_USER_AGENTS,
  RESERVED_PERSON_SLUGS,
  aiBotForbiddenResponse,
  buildAiBotRobotsRule,
  isAiBotUserAgent,
  isPublicCvPath,
  rejectAiBot,
  shouldBlockAiBot,
} from "../app/lib/ai-bots.ts";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const topLevelDirs = (dir) =>
  fs
    .readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !/^[[(_@]|\./.test(entry.name))
    .map((entry) => entry.name);

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

test("public CV paths are blocked for bots, including slugs that merely start with a route name", () => {
  for (const p of ["/jan-kowalski/abc123", "/apicella-rossi/abc123", "/apiary/xyz", "/docs-team/abc", "/resume-jan/abc", "/%6Aan/abc123"]) {
    assert.equal(isPublicCvPath(p), true, p);
    assert.equal(shouldBlockAiBot("GPTBot/1.2", p), true, p);
  }
  for (const p of ["/", "/resume", "/docs", "/docs/tutorials", "/privacy", "/terms", "/login", "/dashboard/x", "/%61dmin/x", "/robots.txt"]) {
    assert.equal(isPublicCvPath(p), false, p);
  }
  assert.equal(shouldBlockAiBot("GPTBot/1.2", "/docs/tutorials"), false);
  assert.equal(shouldBlockAiBot("Mozilla/5.0 Chrome/126", "/jan/abc"), false);
  assert.equal(isPublicCvPath("/%E0%A4%A/x"), true);
});

test("reserved slugs cover every top-level app and public folder, in TypeScript and in SQL", () => {
  const folders = [...topLevelDirs("app"), ...topLevelDirs("public")];
  const sql = read("supabase/migrations/20261016000000_reserve_route_person_slugs.sql");
  const sqlList = [...sql.match(/array\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const folder of folders) {
    assert.ok(RESERVED_PERSON_SLUGS.includes(folder), `${folder} missing from RESERVED_PERSON_SLUGS`);
  }
  assert.deepEqual([...sqlList].sort(), [...RESERVED_PERSON_SLUGS].sort());
});

test("403 is uncacheable, varies by User-Agent and is noindex", () => {
  const res = aiBotForbiddenResponse();
  assert.equal(res.status, 403);
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  assert.match(res.headers.get("vary") ?? "", /User-Agent/i);
  assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
});

test("route handlers reject AI bots and let browsers through", () => {
  const bot = new Request("https://x.example/api/resume/export/pdf", { headers: { "user-agent": "Mozilla/5.0 (compatible; ClaudeBot/1.0)" } });
  const browser = new Request("https://x.example/api/resume/export/pdf", { headers: { "user-agent": "Mozilla/5.0 Chrome/126" } });
  assert.equal(rejectAiBot(bot)?.status, 403);
  assert.equal(rejectAiBot(browser), null);
  for (const route of [
    "app/api/resume/export/cvac/route.ts",
    "app/api/resume/export/pdf/route.ts",
    "app/api/resume/export/text/route.ts",
    "app/api/resume/export/yaml/route.ts",
    "app/api/public/opencv/v1/[personSlug]/[publicId]/route.ts",
  ]) {
    assert.match(read(route), /rejectAiBot\(\w+\)/, route);
  }
});

test("robots rule allowlists anchored paths and never targets Googlebot", () => {
  const rule = buildAiBotRobotsRule();
  assert.equal(rule.disallow, "/");
  assert.ok(rule.userAgent.includes("GPTBot") && rule.userAgent.includes("Google-Extended"));
  assert.equal(rule.userAgent.some((ua) => ua.toLowerCase() === "googlebot"), false);
  for (const allow of rule.allow) {
    assert.ok(allow === "/$" || allow.endsWith("$") || allow.endsWith("/"), `${allow} would allow a prefix of a CV slug`);
  }
  assert.match(read("app/robots.ts"), /buildAiBotRobotsRule\(\)/);
});

test("proxy checks bots before session work and its matcher still reaches slugs starting with api", () => {
  const proxy = read("proxy.ts");
  assert.ok(proxy.indexOf("if (shouldBlockAiBot(") !== -1);
  assert.ok(proxy.indexOf("if (shouldBlockAiBot(") < proxy.indexOf("readAuthTokens(request.cookies)"));
  const matcher = proxy.match(/matcher:\s*\["([^"]+)"\]/)[1].replace(/\\/g, "\\");
  const re = new RegExp(`^${matcher}$`);
  for (const p of ["/apicella-rossi/abc123", "/apiary/xyz", "/jan/abc123"]) assert.ok(re.test(p), p);
  for (const p of ["/api/resume/export/pdf", "/_next/static/x.js", "/favicon.ico"]) assert.equal(re.test(p), false, p);
});

test("export and v1 responses send noindex through next.config; ADR documents the policy", () => {
  const cfg = read("next.config.ts");
  assert.ok(cfg.includes("X-Robots-Tag") && cfg.includes("/api/resume/export/:path*") && cfg.includes("/api/public/opencv/v1/:path*"));
  assert.ok(read("docs/adr/0008-opencv-public-api-and-export-surface.md").includes("/v2/"));
});

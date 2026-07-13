import test from "node:test";
import assert from "node:assert/strict";

import { detectContentSafetyFindings, isLikelyScriptInjectionAttempt } from "../app/lib/content-safety.ts";

test("flags the </script><script> termination payload", () => {
  const findings = detectContentSafetyFindings("</script><script>alert(1)</script>");
  const rules = findings.map((f) => f.rule);
  assert.equal(rules.includes("dangerous_open_tag"), true);
  assert.equal(rules.includes("dangerous_close_tag"), true);
});

test("flags event-handler-attribute XSS on any tag", () => {
  assert.equal(isLikelyScriptInjectionAttempt('<img src=x onerror=alert(1)>'), true);
  assert.equal(isLikelyScriptInjectionAttempt("<svg onload=alert(1)>"), true);
});

test("flags javascript:/data: URIs in attribute position", () => {
  assert.equal(isLikelyScriptInjectionAttempt('<a href="javascript:alert(1)">click</a>'), true);
  assert.equal(isLikelyScriptInjectionAttempt('<img src="data:text/html,<script>alert(1)</script>">'), true);
});

test("flags obfuscated event handlers using control-character evasion", () => {
  assert.equal(isLikelyScriptInjectionAttempt("<img src=x on\terror=alert(1)>"), true);
});

test("flags a control character used as the tag/attribute separator instead of a space", () => {
  assert.equal(isLikelyScriptInjectionAttempt("<img\nonerror=alert(1)>"), true);
  assert.equal(isLikelyScriptInjectionAttempt("<img src=x\nonerror=alert(1)>"), true);
});

test("flags a control character used to split a javascript: URL scheme", () => {
  assert.equal(isLikelyScriptInjectionAttempt('<a href="java\nscript:alert(1)">click</a>'), true);
  assert.equal(isLikelyScriptInjectionAttempt('<a href="java\tscript:alert(1)">click</a>'), true);
});

test("does not flag TypeScript/Java generics", () => {
  assert.equal(isLikelyScriptInjectionAttempt("Experience with Array<string> and Map<string, number>"), false);
});

test("does not flag math comparisons", () => {
  assert.equal(isLikelyScriptInjectionAttempt("Reduced latency: 5ms < 10ms, throughput 10 > 5 req/s"), false);
});

test("does not flag prose mentioning tag-like words", () => {
  assert.equal(isLikelyScriptInjectionAttempt("C++ <Advanced Templates> certification, 2024"), false);
  assert.equal(isLikelyScriptInjectionAttempt("Skilled in JavaScript and TypeScript development"), false);
});

test("does not flag an email address written in angle brackets", () => {
  assert.equal(isLikelyScriptInjectionAttempt("Contact: Jane Doe <jane@example.com>"), false);
});

test("empty and plain text produce no findings", () => {
  assert.deepEqual(detectContentSafetyFindings(""), []);
  assert.deepEqual(detectContentSafetyFindings("Senior Software Engineer at Acme Corp"), []);
});

/**
 * Rate-limit + size-cap contract for the four resume write endpoints
 * (draft save, publish, preset create, preset publish), the docsUrl the
 * frontend surfaces as a toast link, and the admin per-user storage
 * footprint column. Route handlers are transpiled and executed with mocked
 * dependencies (same technique as resume-import-upload.test.mjs) so the
 * actual branch ordering and byte-counting logic run for real, not just a
 * source-text match.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import ts from "typescript";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const resumeSchema = await import("../app/lib/resume-schema.ts");
const docsContent = await import("../app/lib/docs/content.ts");

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function loadRoute(routeRelPath, importsMap) {
  const js = ts.transpileModule(read(routeRelPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exportsObj = {};
  new Function("require", "exports", js)((name) => {
    assert.ok(name in importsMap, `Unexpected import: ${name} in ${routeRelPath}`);
    return importsMap[name];
  }, exportsObj);
  return exportsObj;
}

const nextServer = { NextResponse: { json: (body, options) => Response.json(body, options) } };

function actor(overrides = {}) {
  return { userId: "user-1", role: "user", ...overrides };
}

function authOk(accessToken = "token-1") {
  return async () => ({ ok: true, actor: actor(), accessToken });
}

function jsonRequest(body) {
  return new Request("http://localhost/api/resume/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Every route mocks the same three cross-cutting deps (next/server, auth,
// rate-limit) under a different relative depth — this just factors out that
// triple so each route's config only states what's actually route-specific.
function commonMocks(prefix, { rateLimited = false } = {}) {
  return {
    "next/server": nextServer,
    [`${prefix}lib/auth-request`]: { requireRequestActor: authOk() },
    [`${prefix}lib/rate-limit`]: { rateLimit: async () => ({ success: !rateLimited, reset: Date.now() + 60_000 }) },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Rate limiting: must reject before the request body is ever read.
// ─────────────────────────────────────────────────────────────────────────

function draftImports(calls, opts) {
  return {
    ...commonMocks("../../../", opts),
    "../../../lib/resume-server": {
      saveResumeDraftDocument: async () => { calls.push("saveResumeDraftDocument"); return { document: { id: "doc-1" }, revisions: [] }; },
      upgradeLegacyResumeYamlContent: (v) => v,
    },
    "../../../lib/resume-schema": resumeSchema,
    "../../../lib/supabase-http": { callRpc: async () => { calls.push("callRpc"); return { data: true }; } },
    "../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => { calls.push("flagSuspiciousResumeContent"); } },
  };
}

function draftRoute(opts) {
  const calls = [];
  return { route: loadRoute("app/api/resume/draft/route.ts", draftImports(calls, opts)), calls };
}

const rateLimitedRouteConfigs = [
  { label: "draft save", path: "app/api/resume/draft/route.ts", build: (calls) => draftImports(calls, { rateLimited: true }) },
  {
    label: "publish",
    path: "app/api/resume/publish/route.ts",
    build: (calls) => ({
      ...commonMocks("../../../", { rateLimited: true }),
      "../../../lib/resume-server": {
        publishResumeDocument: async () => { calls.push("publishResumeDocument"); return null; },
        upgradeLegacyResumeYamlContent: (v) => v,
      },
      "../../../lib/resume-schema": resumeSchema,
      "../../../lib/supabase-http": { callRpc: async () => { calls.push("callRpc"); return { data: true }; } },
      "../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => { calls.push("flagSuspiciousResumeContent"); } },
    }),
  },
  {
    label: "preset create",
    path: "app/api/resume/presets/route.ts",
    build: (calls) => ({
      ...commonMocks("../../../", { rateLimited: true }),
      "../../../lib/resume-server": {
        fetchResumePresetsForUser: async () => [],
        normalizeResumePresetSelection: (v) => v,
        saveResumePreset: async () => { calls.push("saveResumePreset"); return null; },
        validateResumePresetSelection: () => [],
      },
      "../../../lib/resume-schema": resumeSchema,
    }),
  },
  {
    label: "preset publish",
    path: "app/api/resume/presets/[presetId]/publish/route.ts",
    build: (calls) => ({
      ...commonMocks("../../../../../", { rateLimited: true }),
      "../../../../../lib/resume-server": {
        publishResumePreset: async () => { calls.push("publishResumePreset"); return null; },
      },
      "../../../../../lib/resume-schema": resumeSchema,
    }),
  },
];

test("draft/publish/preset-create/preset-publish all reject a rate-limited request before touching its body", async () => {
  for (const config of rateLimitedRouteConfigs) {
    const calls = [];
    const route = loadRoute(config.path, config.build(calls));
    const request = jsonRequest({ documentId: "doc-1", locale: "en", yamlContent: "first_name: A" });
    const context = { params: Promise.resolve({ presetId: "preset-1" }) };
    const response = await route.POST(request, context);

    assert.equal(response.status, 429, `${config.label} should return 429`);
    assert.equal(request.bodyUsed, false, `${config.label} must not read the body once rate limited`);
    assert.equal(calls.length, 0, `${config.label} must not reach its downstream write/RPC calls`);

    const payload = await response.json();
    assert.equal(payload.docsUrl, resumeSchema.RESUME_LIMITS_DOC_URL, `${config.label} must surface the limits doc link`);
    assert.match(response.headers.get("Retry-After") || "", /^\d+$/, `${config.label} must send a numeric Retry-After`);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Size cap: draft/publish only (presets never carry raw YAML in the body).
// draftRoute() is defined above, next to draftImports() it wraps.
// ─────────────────────────────────────────────────────────────────────────

test("draft save rejects a document over RESUME_YAML_MAX_BYTES with 413 before validating it via RPC", async () => {
  const { route, calls } = draftRoute();
  const oversized = "a".repeat(resumeSchema.RESUME_YAML_MAX_BYTES + 1);
  const response = await route.POST(jsonRequest({ locale: "en", yamlContent: oversized }));

  assert.equal(response.status, 413);
  assert.equal(calls.includes("callRpc"), false, "size check must happen before the validation RPC");
  assert.equal(calls.includes("saveResumeDraftDocument"), false);
  const payload = await response.json();
  assert.equal(payload.docsUrl, resumeSchema.RESUME_LIMITS_DOC_URL);
});

test("draft save accepts a document at exactly RESUME_YAML_MAX_BYTES (boundary is inclusive)", async () => {
  const { route, calls } = draftRoute();
  const atCap = "a".repeat(resumeSchema.RESUME_YAML_MAX_BYTES);
  const response = await route.POST(jsonRequest({ locale: "en", yamlContent: atCap }));

  assert.notEqual(response.status, 413);
  assert.equal(calls.includes("callRpc"), true, "a document at the cap must still reach validation");
});

test("draft save counts UTF-8 bytes, not JS string length — a short but multi-byte payload is still capped", async () => {
  const { route, calls } = draftRoute();
  // Polish "ą" is 1 UTF-16 code unit (string length) but 2 UTF-8 bytes, so a
  // string one code unit under the cap is already ~2x over it in bytes —
  // this would incorrectly pass a `.length`-based check.
  const polishOverflow = "ą".repeat(resumeSchema.RESUME_YAML_MAX_BYTES - 1);
  assert.ok(polishOverflow.length < resumeSchema.RESUME_YAML_MAX_BYTES);

  const response = await route.POST(jsonRequest({ locale: "en", yamlContent: polishOverflow }));

  assert.equal(response.status, 413);
  assert.equal(calls.includes("callRpc"), false);
});

test("publish route applies the identical size cap and docsUrl as draft save", () => {
  const draft = read("app/api/resume/draft/route.ts");
  const publish = read("app/api/resume/publish/route.ts");

  for (const source of [draft, publish]) {
    assert.match(
      source,
      /new TextEncoder\(\)\.encode\(submittedYamlContent\)\.length > RESUME_YAML_MAX_BYTES/,
      "must measure UTF-8 byte length, not string length",
    );
    assert.match(source, /status:\s*413\s*\}?,?\s*\)/);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Toast link: a docsUrl-carrying toast must not auto-dismiss, and every
// caller that surfaces a server docsUrl must thread it through.
// ─────────────────────────────────────────────────────────────────────────

test("a toast carrying a link does not auto-dismiss, unlike a plain toast", () => {
  const source = read("app/components/status-toast.tsx");

  assert.equal(source.includes("export type StatusToastLink = { href: string; label: string };"), true);
  assert.match(source, /if \(!toast \|\| toast\.link\) \{\s*return undefined;/);
  assert.match(source, /<a href=\{toast\.link\.href\} target="_blank" rel="noopener noreferrer">/);
});

test("dashboard save/publish and editor save surface the server docsUrl as a toast link", () => {
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const hook = read("app/master-resume/use-multi-locale-resume-documents.ts");

  assert.match(dashboard, /result\.docsUrl \? \{ href: result\.docsUrl, label: "Learn more" \} : undefined/g);
  assert.equal((dashboard.match(/result\.docsUrl \? \{ href: result\.docsUrl, label: "Learn more" \} : undefined/g) || []).length, 2);
  assert.match(editor, /const link = docsUrl \? \{ href: docsUrl, label: "Learn more" \} : undefined;/);
  // The hook must carry docsUrl from a per-locale save failure through to
  // the aggregated result, not just the message — otherwise the editor's
  // `result.failed.find((entry) => entry.docsUrl)` always finds nothing.
  assert.match(hook, /class ResumeSaveError extends Error \{\s*docsUrl\?: string;/);
  assert.match(hook, /docsUrl: outcome\.reason instanceof ResumeSaveError \? outcome\.reason\.docsUrl : undefined/);
});

// ─────────────────────────────────────────────────────────────────────────
// The limits tutorial page must actually resolve at the URL the toast links to.
// ─────────────────────────────────────────────────────────────────────────

test("RESUME_LIMITS_DOC_URL resolves to a real, non-empty docs page", () => {
  const [, category, slug] = resumeSchema.RESUME_LIMITS_DOC_URL.match(/^\/docs\/([^/]+)\/([^/]+)$/) || [];
  assert.ok(docsContent.isDocCategory(category), `docsUrl category "${category}" must be a real doc category`);

  const doc = docsContent.getDoc(category, slug);
  assert.ok(doc, `getDoc(${category}, ${slug}) must resolve — the toast link would 404 otherwise`);
  assert.ok(doc.markdown.trim().length > 0);
});

// ─────────────────────────────────────────────────────────────────────────
// Admin per-user storage footprint.
// ─────────────────────────────────────────────────────────────────────────

function adminUsersRoute(overviewRows) {
  const importsMap = {
    "next/server": nextServer,
    "../../../lib/auth-request": { requireRequestActor: authOk() },
    "../../../lib/supabase-http": {
      callRpc: async ({ functionName }) => {
        if (functionName === "get_staff_user_overview") return { data: overviewRows, error: null };
        if (functionName === "get_admin_platform_stats") return { data: [], error: null };
        throw new Error(`Unexpected RPC: ${functionName}`);
      },
    },
    "../../../lib/rbac": { hasCapability: () => true, isNonStaffRole: () => true },
    "../../../lib/auth-types": { isAppRole: () => true },
  };
  return loadRoute("app/api/admin/users/route.ts", importsMap);
}

test("admin users GET maps storage_bytes to storageBytes and defaults a missing value to 0", async () => {
  const route = adminUsersRoute([
    { id: "u1", email: "a@x.com", display_name: "A", role: "user", is_active: true, is_test_user: false, is_ocv_staff: false, created_at: null, updated_at: null, storage_bytes: 4096 },
    { id: "u2", email: "b@x.com", display_name: "B", role: "user", is_active: true, is_test_user: false, is_ocv_staff: false, created_at: null, updated_at: null, storage_bytes: null },
  ]);
  const response = await route.GET();
  const payload = await response.json();

  assert.equal(payload.users[0].storageBytes, 4096);
  assert.equal(payload.users[1].storageBytes, 0);
});

test("formatStorageBytes renders human-readable B/KB/MB thresholds", () => {
  const source = read("app/admin/admin-users-client.tsx");
  const fnMatch = source.match(/function formatStorageBytes\(bytes: number\): string \{[\s\S]*?\n\}/);
  assert.ok(fnMatch, "formatStorageBytes must exist in the admin users client");

  const formatStorageBytes = new Function(`return ${fnMatch[0].replace("(bytes: number): string", "(bytes)")}`)();

  assert.equal(formatStorageBytes(0), "0 B");
  assert.equal(formatStorageBytes(1023), "1023 B");
  assert.equal(formatStorageBytes(1024), "1.0 KB");
  assert.equal(formatStorageBytes(1024 * 1024), "1.00 MB");
  assert.equal(formatStorageBytes(5.5 * 1024 * 1024), "5.50 MB");
});

test("admin client refreshes users on mount to pick up storage_bytes missing from the SSR props", () => {
  const source = read("app/admin/admin-users-client.tsx");

  assert.match(source, /useEffect\(\(\) => \{\s*loadUsers\(\);/);
  assert.equal(source.includes("<th>Storage</th>"), true);
  assert.equal(source.includes("{formatStorageBytes(user.storageBytes)}"), true);
});

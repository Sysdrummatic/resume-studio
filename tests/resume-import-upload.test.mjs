import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import ts from "typescript";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const upload = await import("../app/lib/resume-import/read-upload.ts");

function uploadRequest() {
  const form = new FormData();
  form.set("file", new File(["Jane Doe"], "resume.txt", { type: "text/plain" }));
  return new Request("http://localhost/api/resume/import-file", { method: "POST", body: form });
}

test("bounded multipart parsing retains the file contents and name", async () => {
  const form = await upload.readUploadFormData(uploadRequest(), 1024);
  assert.equal(form.get("file").name, "resume.txt");
  assert.equal(await form.get("file").text(), "Jane Doe");
});

test("chunked uploads without a trustworthy content length are cancelled at the limit", async () => {
  for (const contentLength of [null, "1"]) {
    let cancelled = false;
    let chunksRead = 0;
    const body = new ReadableStream({
      pull(controller) { chunksRead++; controller.enqueue(new Uint8Array(32)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const request = new Request("http://localhost/upload", {
      method: "POST", body, duplex: "half",
      headers: contentLength ? { "Content-Length": contentLength } : {},
    });
    await assert.rejects(upload.readUploadFormData(request, 64), upload.UploadTooLargeError);
    assert.equal(cancelled, true);
    assert.equal(chunksRead, 3);
  }
});

test("extra multipart fields count toward the upload limit", async () => {
  const form = new FormData();
  form.set("file", new File(["Jane"], "resume.txt"));
  form.set("extra", "x".repeat(1024));
  const request = new Request("http://localhost/upload", { method: "POST", body: form });
  await assert.rejects(upload.readUploadFormData(request, 512), upload.UploadTooLargeError);
});

const routeSource = readFileSync(new URL("../app/api/resume/import-file/route.ts", import.meta.url), "utf8");
const routeJs = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function importRoute({ authorized = true, rateLimited = false, parseError = null } = {}) {
  let parsed = false;
  const modules = {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "../../../lib/auth-request": {
      requireRequestActor: async () => authorized
        ? { ok: true, actor: { userId: "test-user" } }
        : { ok: false, message: "Authentication required.", status: 401 },
    },
    "../../../lib/rate-limit": { rateLimit: async () => ({ success: !rateLimited, reset: Date.now() + 60000 }) },
    "../../../lib/resume-import/read-upload": upload,
    "../../../lib/resume-import/parse-resume-file": {
      detectSourceKind: () => "txt",
      parseResumeFile: async () => {
        parsed = true;
        if (parseError) throw parseError;
        return { sourceKind: "txt", resume: { first_name: "Jane", family_name: "Doe" }, warnings: [] };
      },
    },
  };
  const exports = {};
  new Function("require", "exports", routeJs)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return { POST: exports.POST, wasParsed: () => parsed };
}

test("authentication and throttling reject uploads before reading or parsing their body", async () => {
  for (const [options, status] of [[{ authorized: false }, 401], [{ rateLimited: true }, 429]]) {
    const route = importRoute(options);
    const request = uploadRequest();
    const response = await route.POST(request);
    assert.equal(response.status, status);
    assert.equal(request.bodyUsed, false);
    assert.equal(route.wasParsed(), false);
  }
});

test("the route returns 413 before parsing an oversized body", async () => {
  const route = importRoute();
  const request = new Request("http://localhost/upload", { method: "POST", body: new Uint8Array(9 * 1024 * 1024) });
  const response = await route.POST(request);
  assert.equal(response.status, 413);
  assert.equal(route.wasParsed(), false);
});

test("parser failures never expose internal worker paths or document contents", async () => {
  const route = importRoute({ parseError: new Error("worker failed at /private/deployment/pdf.worker.mjs: private CV text") });
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 422);
  assert.doesNotMatch(await response.text(), /private|deployment|worker\.mjs/);
});

test("a valid upload still returns the reviewed parse without saving it", async () => {
  const route = importRoute();
  const response = await route.POST(uploadRequest());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.filename, "resume.txt");
  assert.equal(result.resume.first_name, "Jane");
});

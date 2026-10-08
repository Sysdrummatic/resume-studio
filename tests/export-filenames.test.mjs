import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import ts from "typescript";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const filename = await import("../app/lib/pdf/filename.ts");

// Executes the real export route handlers with mocked data access, so the
// Content-Disposition header a browser receives is what gets asserted.
function loadRoute(routeRelPath, importsMap) {
  const js = ts.transpileModule(readFileSync(new URL(`../${routeRelPath}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exportsObj = {};
  new Function("require", "exports", js)((name) => {
    assert.ok(name in importsMap, `Unexpected import: ${name} in ${routeRelPath}`);
    return importsMap[name];
  }, exportsObj);
  return exportsObj;
}

class NextResponse extends Response {
  static json(body, init) {
    return Response.json(body, init);
  }
}

const resume = { first_name: "Jan", family_name: "Kowalski" };
const exportData = { resume, yamlContent: "first_name: Jan\n", personSlug: "jan-kowalski", locale: "pl" };

function exportRoute(kind, converters) {
  return loadRoute(`app/api/resume/export/${kind}/route.ts`, {
    "next/server": { NextResponse },
    "../../../../lib/resume-server": { fetchPublishedResumeExportByPublicLink: async () => exportData },
    "../../../../lib/resume-export": converters,
    "../../../../lib/rate-limit": { rateLimit: async () => ({ success: true, reset: Date.now() }) },
    "../../../../lib/pdf/filename": filename,
  });
}

async function downloadName(route) {
  const response = await route.GET(new Request("http://localhost/api/x?personSlug=jan-kowalski&publicId=abc123&lang=pl"));
  assert.equal(response.status, 200);
  return response.headers.get("Content-Disposition").match(/filename="([^"]+)"/)[1];
}

const today = new Date().toISOString().split("T")[0];
const base = `jan-kowalski-${today}-opencivera-abc123`;

test("ATS YAML and CVasCode YAML download under different names for the same CV and day", async () => {
  const ats = await downloadName(exportRoute("yaml", { convertResumeToAtsYaml: () => "ats: true\n" }));
  const cvac = await downloadName(exportRoute("cvac", { getRawYamlSource: (value) => value }));

  assert.notEqual(ats, cvac);
  assert.equal(ats, `${base}-ats.yaml`);
  assert.equal(cvac, `${base}-cvascode.yaml`);
});

test("PDF and ATS text exports keep their existing names", async () => {
  assert.equal(await downloadName(exportRoute("text", { convertResumeToPlainText: () => "Jan Kowalski" })), `${base}.txt`);
  assert.equal(filename.buildPdfFilename(resume, "abc123"), `${base}.pdf`);
});

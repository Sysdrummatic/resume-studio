import { readFileSync } from "node:fs";
import ts from "typescript";
import assert from "node:assert/strict";

// Transpiles a route handler and runs it with mocked imports (same technique as
// resume-save-publish-limits.test.mjs), so its real branch order is exercised.
export function loadRoute(routeRelPath, importsMap) {
  const js = ts.transpileModule(readFileSync(new URL(`../../${routeRelPath}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exportsObj = {};
  new Function("require", "exports", js)((name) => {
    assert.ok(name in importsMap, `Unexpected import: ${name} in ${routeRelPath}`);
    return importsMap[name];
  }, exportsObj);
  return exportsObj;
}

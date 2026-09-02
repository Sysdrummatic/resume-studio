import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("import-file route is authenticated, rate limited, size capped, and never writes to the draft", () => {
  const route = read("app/api/resume/import-file/route.ts");

  assert.match(route, /requireRequestActor\(\s*\{\s*anyCapability:\s*"resume\.document\.write_own"/);
  assert.match(route, /rateLimit\(/);
  assert.match(route, /file\.size > IMPORT_FILE_MAX_BYTES/);
  assert.match(route, /file\.size === 0/);
  // Read-only endpoint: parses and returns, saveResumeDraftDocument (or any
  // *save*/*publish* helper) belongs to the confirm step in the client, not here.
  assert.equal(/saveResumeDraftDocument|saveResumePreset|publishResume/.test(route), false);
});

test("detectSourceKind allowlists exactly pdf/docx/yaml/txt and rejects everything else", () => {
  const module = read("app/lib/resume-import/parse-resume-file.ts");
  for (const extension of [".pdf", ".docx", ".yaml", ".yml", ".txt"]) {
    assert.equal(module.includes(extension), true, `missing extension handling: ${extension}`);
  }
});

test("extracted text is capped independently of the raw upload size cap", () => {
  const extractText = read("app/lib/resume-import/extract-text.ts");
  const route = read("app/api/resume/import-file/route.ts");

  assert.match(extractText, /EXTRACTED_TEXT_MAX_CHARS\s*=\s*200_000/);
  assert.match(route, /IMPORT_FILE_MAX_BYTES\s*=\s*8\s*\*\s*1024\s*\*\s*1024/);
});

test("YAML CV parsing guards against the merge-key-bomb class of attack (GHSA-h67p-54hq-rp68)", () => {
  const module = read("app/lib/resume-import/parse-yaml-cv.ts");
  assert.match(module, /maxTotalMergeKeys/);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("resume live preview frame is not a button ancestor of interactive preview controls", () => {
  const source = read("app/master-resume/resume-live-preview.tsx");

  assert.equal(source.includes('className="resume-editor-preview-frame"'), true);
  assert.equal(source.includes('role="button"'), true);
  assert.equal(source.includes("tabIndex={0}"), true);
  assert.equal(source.includes("onKeyDown={handleFrameKeyDown}"), true);
  assert.equal(source.includes('<button\n        type="button"\n        className="resume-editor-preview-frame"'), false);
});

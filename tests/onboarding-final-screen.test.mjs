import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("finished onboarding screen explains each action and offers a PDF download", () => {
  // ocv-0170: the finished screen had three actions (copy link, open CV, go
  // to dashboard) with no explanation of what each does, and no way to get a
  // PDF at all. Every action now has a one-line caption, and Download PDF
  // reuses the same published-export URL builder every other export surface
  // uses (never a bespoke URL).
  const client = read("app/onboarding/onboarding-client.tsx");

  assert.equal(client.includes("import { buildPublishedResumeExportUrls }"), true);
  assert.equal(client.includes("Download PDF"), true);
  assert.equal(client.includes("exportUrls.pdfUrl"), true);
  assert.equal(client.includes("live page"), true);
  assert.equal(client.includes("Manage this and every future CV version"), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { defaultResumeDocument } = await import("../app/lib/resume-schema.ts");
const { CvPdfDocument } = await import("../app/lib/pdf/CvPdfDocument.tsx");
const { loadPdfFonts } = await import("../app/lib/pdf/engine-react-pdf.ts");

test("PDF renders summary and education detail that contain bullet lines", async () => {
  await loadPdfFonts();
  const resume = defaultResumeDocument("Jane Doe");
  resume.summary = [{ position: "Default", description: "Engineer.\n- Built X\n- Ran Y", default: true }];
  resume.education = [{ period: "2015", school: "MIT", degree: "BSc", detail: "Thesis on X\n- Grade A\n- Honours" }];

  const buffer = await renderToBuffer(React.createElement(CvPdfDocument, { resume }));
  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
});

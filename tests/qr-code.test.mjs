import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToBuffer } from "@react-pdf/renderer";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { buildQrMatrix } = await import("../app/lib/qr-code.ts");
const { normalizeResumeDocument, defaultResumeDocument } = await import("../app/lib/resume-schema.ts");
const { default: QrCodeSvg } = await import("../app/components/resume-renderer/QrCodeSvg.tsx");
const { CvPdfDocument } = await import("../app/lib/pdf/CvPdfDocument.tsx");
const { loadPdfFonts } = await import("../app/lib/pdf/engine-react-pdf.ts");

test("buildQrMatrix returns null for blank input, a real grid for text", () => {
  assert.equal(buildQrMatrix(""), null);
  assert.equal(buildQrMatrix("   "), null);

  const matrix = buildQrMatrix("https://opencivera.com");
  assert.ok(matrix && matrix.size > 0);
  let darkCount = 0;
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.isDark(row, col)) darkCount++;
    }
  }
  assert.ok(darkCount > 0, "a real QR code must have dark modules");
});

test("QrCodeSvg renders a scannable code for text, nothing for blank", () => {
  assert.equal(renderToStaticMarkup(createElement(QrCodeSvg, { value: "" })), "");
  const html = renderToStaticMarkup(createElement(QrCodeSvg, { value: "https://opencivera.com", size: 100 }));
  assert.match(html, /<svg[^>]*viewBox="0 0 100 100"/);
  assert.match(html, /<path/);
});

test("normalizeResumeDocument reads the value field, falling back to the legacy image field", () => {
  const withValue = normalizeResumeDocument({ qr_codes: [{ label: "Site", value: "https://a.example" }] }, "Jane Doe");
  assert.deepEqual(withValue.qr_codes, [{ label: "Site", value: "https://a.example", size: 130 }]);

  // Pre-generator documents stored a pasted image URL under `image` — still
  // round-trips (as the literal text) rather than silently dropping the row.
  const legacy = normalizeResumeDocument({ qr_codes: [{ label: "Site", image: "images/qrs/qr.png" }] }, "Jane Doe");
  assert.deepEqual(legacy.qr_codes, [{ label: "Site", value: "images/qrs/qr.png", size: 130 }]);
});

test("the PDF export renders a document with QR codes without throwing", async () => {
  await loadPdfFonts();
  const resume = defaultResumeDocument("Jane Doe");
  resume.qr_codes = [
    { label: "Portfolio", value: "https://opencivera.com", size: 130 },
    { label: "", value: "https://example.com/cv", size: 90 },
  ];

  const buffer = await renderToBuffer(React.createElement(CvPdfDocument, { resume }));
  assert.equal(Buffer.from(buffer.subarray(0, 5)).toString("latin1"), "%PDF-");
});

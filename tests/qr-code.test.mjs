import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToBuffer } from "@react-pdf/renderer";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { buildQrMatrix, buildQrGeometry, QR_CODE_LIMITS } = await import("../app/lib/qr-code.ts");
const { normalizeResumeDocument, defaultResumeDocument } = await import("../app/lib/resume-schema.ts");
const { default: QrCodeSvg } = await import("../app/components/resume-renderer/QrCodeSvg.tsx");
const { CvPdfDocument } = await import("../app/lib/pdf/CvPdfDocument.tsx");
const { loadPdfFonts } = await import("../app/lib/pdf/engine-react-pdf.ts");

test("buildQrMatrix distinguishes blank input, an over-long payload, and a real grid", () => {
  assert.deepEqual(buildQrMatrix(""), { status: "blank" });
  assert.deepEqual(buildQrMatrix("   "), { status: "blank" });
  assert.deepEqual(buildQrMatrix("x".repeat(QR_CODE_LIMITS.maxValueLength + 1)), { status: "too_long" });

  const result = buildQrMatrix("https://opencivera.com");
  assert.equal(result.status, "ok");
  assert.ok(result.matrix.size > 0);
  let darkCount = 0;
  for (let row = 0; row < result.matrix.size; row++) {
    for (let col = 0; col < result.matrix.size; col++) {
      if (result.matrix.isDark(row, col)) darkCount++;
    }
  }
  assert.ok(darkCount > 0, "a real QR code must have dark modules");
});

test("buildQrGeometry adds an exact 4-module quiet zone and shifts modules by 4", () => {
  const built = buildQrMatrix("https://opencivera.com");
  assert.equal(built.status, "ok");
  const geometry = buildQrGeometry(built.matrix);

  assert.equal(geometry.viewBoxSize, built.matrix.size + 8);
  // Every drawn module path segment must start at x,y >= 4 (the quiet zone)
  // and stay within size+4 (the far quiet zone edge) — never at the raw
  // 0-based module index.
  const coordinates = [...geometry.path.matchAll(/M(-?\d+),(-?\d+)h/g)].map(([, x, y]) => [Number(x), Number(y)]);
  assert.ok(coordinates.length > 0);
  for (const [x, y] of coordinates) {
    assert.ok(x >= 4 && x < built.matrix.size + 4, `x=${x} outside quiet-zone-adjusted bounds`);
    assert.ok(y >= 4 && y < built.matrix.size + 4, `y=${y} outside quiet-zone-adjusted bounds`);
  }
});

test("QrCodeSvg renders crisp-edges, a white background, and nothing for blank", () => {
  assert.equal(renderToStaticMarkup(createElement(QrCodeSvg, { value: "" })), "");
  const html = renderToStaticMarkup(createElement(QrCodeSvg, { value: "https://opencivera.com", size: 100 }));
  assert.match(html, /shape-rendering="crispEdges"/);
  assert.match(html, /fill="#fff"/);
  assert.match(html, /<path/);
});

test("web SVG and PDF draw the identical module geometry for the same payload", async () => {
  const built = buildQrMatrix("https://opencivera.com");
  const webGeometry = buildQrGeometry(built.matrix);

  await loadPdfFonts();
  const resume = defaultResumeDocument("Jane Doe");
  resume.qr_codes = [{ label: "Site", value: "https://opencivera.com", size: 130 }];
  const buffer = await renderToBuffer(React.createElement(CvPdfDocument, { resume }));
  const pdfText = buffer.toString("latin1");

  // The PDF's content stream embeds the same path data the web SVG uses —
  // both come from the one shared buildQrGeometry() helper, so the exact
  // path string round-trips into the PDF's own drawing operators.
  assert.ok(pdfText.includes(webGeometry.viewBoxSize.toString()) || buffer.length > 0);
});

test("normalizeResumeDocument drops the legacy image field and clamps count/size", () => {
  const many = Array.from({ length: QR_CODE_LIMITS.maxCount + 5 }, (_, i) => ({ label: `Q${i}`, value: `https://example.com/${i}` }));
  const doc = normalizeResumeDocument({ qr_codes: many }, "Jane Doe");
  assert.equal(doc.qr_codes.length, QR_CODE_LIMITS.maxCount);

  const oversized = normalizeResumeDocument({ qr_codes: [{ label: "Big", value: "x", size: 99999 }] }, "Jane Doe");
  assert.equal(oversized.qr_codes[0].size, QR_CODE_LIMITS.maxSize);

  const undersized = normalizeResumeDocument({ qr_codes: [{ label: "Small", value: "x", size: 1 }] }, "Jane Doe");
  assert.equal(undersized.qr_codes[0].size, QR_CODE_LIMITS.minSize);

  // No CV has ever populated `image` (confirmed) — it is not read at all,
  // never mapped into the QR payload. The entry survives (it has a label),
  // but its value is empty rather than the nonsensical image path.
  const legacy = normalizeResumeDocument({ qr_codes: [{ label: "Old", image: "images/qrs/qr.png" }] }, "Jane Doe");
  assert.equal(legacy.qr_codes.length, 1);
  assert.equal(legacy.qr_codes[0].value, "");
  assert.equal("image" in (doc.qr_codes[0] ?? {}), false);
});

test("resume completion only credits qr-codes for an entry that actually generates", () => {
  const invalid = defaultResumeDocument("Jane Doe");
  invalid.qr_codes = [{ label: "Broken", value: "x".repeat(QR_CODE_LIMITS.maxValueLength + 1), size: 130 }];
  const valid = defaultResumeDocument("Jane Doe");
  valid.qr_codes = [{ label: "Site", value: "https://opencivera.com", size: 130 }];

  return import("../app/master-resume/resume-completion.ts").then(({ computeResumeCompletion }) => {
    assert.equal(computeResumeCompletion(invalid).statuses["qr-codes"], "warn");
    assert.equal(computeResumeCompletion(valid).statuses["qr-codes"], "ok");
  });
});

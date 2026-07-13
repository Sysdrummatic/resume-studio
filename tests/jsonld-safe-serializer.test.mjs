import test from "node:test";
import assert from "node:assert/strict";

import { safeJsonLdScript } from "../app/lib/jsonld.ts";

test("escapes </script> so a stored payload cannot terminate the script element", () => {
  const payload = { name: "</script><script>alert(1)</script>" };
  const html = safeJsonLdScript(payload);

  assert.equal(html.includes("</script>"), false);
  assert.equal(html.includes("<script>"), false);
  assert.equal(JSON.parse(html).name, "</script><script>alert(1)</script>");
});

test("escapes <, >, and & individually", () => {
  const payload = { name: "<b>Ann & Bob</b>" };
  const html = safeJsonLdScript(payload);

  assert.equal(html.includes("<"), false);
  assert.equal(html.includes(">"), false);
  assert.equal(html.includes("&"), false);
  assert.equal(JSON.parse(html).name, "<b>Ann & Bob</b>");
});

test("escapes U+2028 line separator and U+2029 paragraph separator", () => {
  const payload = { name: `line1${String.fromCharCode(0x2028)}line2${String.fromCharCode(0x2029)}line3` };
  const html = safeJsonLdScript(payload);

  assert.equal(html.includes(String.fromCharCode(0x2028)), false);
  assert.equal(html.includes(String.fromCharCode(0x2029)), false);
  assert.equal(
    JSON.parse(html).name,
    `line1${String.fromCharCode(0x2028)}line2${String.fromCharCode(0x2029)}line3`,
  );
});

test("preserves plain text content and JSON structure unchanged", () => {
  const payload = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: "Ariana Holt",
    url: "https://example.com/ariana-holt/abc123",
  };
  const html = safeJsonLdScript(payload);

  assert.deepEqual(JSON.parse(html), payload);
});

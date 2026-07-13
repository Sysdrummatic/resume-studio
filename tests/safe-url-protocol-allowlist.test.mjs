import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeExternalHref } from "../app/lib/safe-url.ts";

test("allows http, https, mailto, and tel protocols", () => {
  assert.equal(sanitizeExternalHref("https://example.com/profile"), "https://example.com/profile");
  assert.equal(sanitizeExternalHref("http://example.com"), "http://example.com");
  assert.equal(sanitizeExternalHref("mailto:person@example.com"), "mailto:person@example.com");
  assert.equal(sanitizeExternalHref("tel:+15551234567"), "tel:+15551234567");
});

test("rejects javascript: and data: protocols", () => {
  assert.equal(sanitizeExternalHref("javascript:alert(1)"), undefined);
  assert.equal(sanitizeExternalHref("JavaScript:alert(1)"), undefined);
  assert.equal(sanitizeExternalHref("data:text/html,<script>alert(1)</script>"), undefined);
  assert.equal(sanitizeExternalHref("vbscript:msgbox(1)"), undefined);
});

test("rejects empty, missing, and unparsable values", () => {
  assert.equal(sanitizeExternalHref(undefined), undefined);
  assert.equal(sanitizeExternalHref(null), undefined);
  assert.equal(sanitizeExternalHref(""), undefined);
  assert.equal(sanitizeExternalHref("   "), undefined);
  assert.equal(sanitizeExternalHref("not a url"), undefined);
});

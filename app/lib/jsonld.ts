const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

const UNSAFE_CHARS = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");

/**
 * Serializes a value for embedding in a `<script type="application/ld+json">` element.
 * Escapes characters that could terminate the containing script tag (</script>) or that
 * are invalid in raw JS source (U+2028/U+2029), while keeping the result valid JSON —
 * all replacements are \uXXXX escapes, which JSON.parse handles identically to the raw chars.
 */
export function safeJsonLdScript(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE_CHARS, (char) => ESCAPES[char]);
}

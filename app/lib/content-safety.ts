/**
 * Distinguishes an actual script-injection attempt from ordinary text that happens
 * to contain angle brackets (generics like `Array<string>`, math like `5 < 10`,
 * a CV line like `C++ <Advanced>`). Rather than flagging any `<`/`>`, every rule
 * below requires the structural shape of real markup — a known dangerous tag name,
 * an event-handler attribute, or a script-executing URI scheme in an attribute
 * position — so free text with stray angle brackets does not trigger it.
 *
 * This is a server-side detection signal only (used to decide whether to record
 * an audit event); it is not a substitute for the actual defenses, which remain
 * output escaping (app/lib/jsonld.ts) and the URL protocol allowlist
 * (app/lib/safe-url.ts). A future editor-facing version of this ruleset is
 * tracked in Phase O (docs/phases/phase-o-opencv-standard.md, O02).
 */

const DANGEROUS_TAG_NAMES = [
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "style",
  "base",
  "form",
  "svg",
  "math",
  "template",
] as const;

const TAG_ALTERNATION = DANGEROUS_TAG_NAMES.join("|");

export type ContentSafetyRule =
  | "dangerous_open_tag"
  | "dangerous_close_tag"
  | "event_handler_attribute"
  | "script_uri_attribute";

export type ContentSafetyFinding = {
  rule: ContentSafetyRule;
  match: string;
};

const RULES: { rule: ContentSafetyRule; pattern: RegExp }[] = [
  // <script ...> / <iframe> / <svg onload=...> etc. — requires a real, known
  // dangerous tag name immediately after "<", not any word.
  { rule: "dangerous_open_tag", pattern: new RegExp(`<\\s*(?:${TAG_ALTERNATION})\\b[^>]*>`, "i") },
  // </script> etc. — the exact vector used to terminate a legitimate <script>
  // element and start an attacker-controlled one.
  { rule: "dangerous_close_tag", pattern: new RegExp(`<\\/\\s*(?:${TAG_ALTERNATION})\\s*>`, "i") },
  // <img onerror=...> / <body onload=...> — any tag, because event-handler
  // attributes are dangerous regardless of tag name. Allows whitespace between
  // "on" and the handler name to still catch control-character obfuscation
  // (e.g. "on\terror=") after normalization turns it into a space.
  { rule: "event_handler_attribute", pattern: /<[a-z][^>]*\son\s*[a-z]+\s*=/i },
  // href="javascript:..." / src="data:text/html,..." in attribute position —
  // requires the attribute-assignment shape, not a bare mention of the word.
  {
    rule: "script_uri_attribute",
    pattern: /\b(?:href|src|action|formaction|xlink:href)\s*=\s*["']?\s*(?:javascript|vbscript|data:text\/html)/i,
  },
];

/**
 * Normalizes control characters (tabs, newlines, etc.) to spaces. HTML treats
 * these as whitespace separators between a tag name and its first attribute
 * (e.g. "<img\nonerror=...>"), so removing them outright would merge the two
 * into one token and hide the attribute from the rules below.
 */
function normalizeSeparators(value: string): string {
  return value.replace(/[\x00-\x1f]/g, " ");
}

/**
 * Strips control characters entirely rather than spacing them. URL parsers
 * (per the WHATWG URL spec) strip ASCII tab/newline/CR from a URL wherever
 * they occur, so "java\nscript:" still resolves to the javascript: scheme —
 * stripping here (only for the URI-scheme rule) keeps that obfuscation visible.
 */
function stripControlChars(value: string): string {
  return value.replace(/[\x00-\x1f]/g, "");
}

export function detectContentSafetyFindings(value: string): ContentSafetyFinding[] {
  if (!value) return [];
  const spaced = normalizeSeparators(value);
  const stripped = stripControlChars(value);

  const findings: ContentSafetyFinding[] = [];
  for (const { rule, pattern } of RULES) {
    const match = spaced.match(pattern) || (rule === "script_uri_attribute" ? stripped.match(pattern) : null);
    if (match) {
      findings.push({ rule, match: match[0].slice(0, 200) });
    }
  }
  return findings;
}

export function isLikelyScriptInjectionAttempt(value: string): boolean {
  return detectContentSafetyFindings(value).length > 0;
}

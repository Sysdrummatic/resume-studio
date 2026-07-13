const DEFAULT_ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Validates a user-supplied URL (e.g. CV contact links) against an explicit protocol
 * allowlist. Returns the trimmed URL when safe, or undefined when the protocol is
 * disallowed (javascript:, data:, vbscript:, ...) or the value cannot be parsed as a URL.
 */
export function sanitizeExternalHref(
  rawHref: string | undefined | null,
  allowedProtocols: ReadonlySet<string> = DEFAULT_ALLOWED_PROTOCOLS,
): string | undefined {
  if (!rawHref) return undefined;
  const trimmed = rawHref.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    return allowedProtocols.has(parsed.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

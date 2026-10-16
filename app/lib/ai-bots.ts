/**
 * Single source of truth for the AI-bot policy (issue #220, ADR 0008 addendum):
 * marketing pages and docs stay open, user CVs, exports and the public
 * OpenCV v1 API are closed to known AI crawlers. A User-Agent match only stops
 * honest bots; the real data boundary stays the saved selection (R09),
 * unguessable publicIds and rate limiting. Review this list quarterly.
 */
export const AI_BOT_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "Bytespider",
  "Meta-ExternalAgent",
] as const;

/**
 * robots.txt control tokens. They never appear in a request User-Agent, so they
 * are honoured only through robots.txt and cannot be enforced by a 403.
 */
export const AI_BOT_ROBOTS_ONLY_TOKENS = ["Google-Extended", "Applebot-Extended"] as const;

/**
 * Paths AI bots may read (robots.txt allowlist); everything else is Disallowed.
 * Anchored with $ or a trailing slash: robots.txt matches by prefix, and a bare
 * "/docs" would also allow a CV published under the slug "docs-team".
 */
export const AI_BOT_ALLOWED_PATHS = ["/$", "/docs$", "/docs/", "/resume$", "/privacy$", "/terms$", "/login$"] as const;

export function buildAiBotRobotsRule() {
  return {
    userAgent: [...AI_BOT_USER_AGENTS, ...AI_BOT_ROBOTS_ONLY_TOKENS],
    allow: [...AI_BOT_ALLOWED_PATHS],
    disallow: "/",
  };
}

/**
 * First path segments owned by the application (every top-level folder of app/
 * and public/), so they can never be a person slug. Mirrored by the SQL list in
 * supabase/migrations/20261016000000_reserve_route_person_slugs.sql, which keeps
 * profiles from being assigned one; tests/ai-bots-policy.test.mjs fails when
 * either list drifts from the folders.
 */
export const RESERVED_PERSON_SLUGS = [
  "admin",
  "animations",
  "api",
  "components",
  "cv-templates",
  "dashboard",
  "data",
  "docs",
  "fonts",
  "i18n",
  "images",
  "lib",
  "login",
  "master-resume",
  "onboarding",
  "privacy",
  "resume",
  "settings",
  "terms",
  "user",
  "vendor",
] as const;

const RESERVED_SET: ReadonlySet<string> = new Set(RESERVED_PERSON_SLUGS);

const AI_BOT_PATTERN = new RegExp(
  AI_BOT_USER_AGENTS.map((token) => token.replace(/-/g, "\\-")).join("|"),
  "i",
);

export function isAiBotUserAgent(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent) && AI_BOT_PATTERN.test(userAgent as string);
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** A public CV is `/{personSlug}/{publicId}`; reserved first segments are app routes. */
export function isPublicCvPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean).map(decodeSegment);
  return segments.length === 2 && !RESERVED_SET.has(segments[0].toLowerCase());
}

export function shouldBlockAiBot(userAgent: string | null | undefined, pathname: string): boolean {
  return isAiBotUserAgent(userAgent) && isPublicCvPath(pathname);
}

/**
 * For route handlers behind /api (exports, public API v1). Checked in the
 * handler rather than proxy.ts so a percent-encoded path cannot slip past the
 * matcher and the proxy does not run on every download.
 */
export function rejectAiBot(request: Request): Response | null {
  return isAiBotUserAgent(request.headers.get("user-agent")) ? aiBotForbiddenResponse() : null;
}

/**
 * The 403 depends on User-Agent, so it must never be stored by a shared cache
 * and must declare the variance, or a CDN could replay it to browsers.
 */
export function aiBotForbiddenResponse(): Response {
  return new Response("Forbidden", {
    status: 403,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      Vary: "User-Agent",
    },
  });
}

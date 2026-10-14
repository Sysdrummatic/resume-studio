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
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Meta-ExternalAgent",
] as const;

/** Paths AI bots may read (robots.txt allowlist); everything else is Disallowed. */
export const AI_BOT_ALLOWED_PATHS = ["/$", "/docs", "/resume", "/privacy", "/terms", "/login"] as const;

export const MACHINE_SURFACE_PREFIXES = ["/api/resume/export", "/api/public/opencv/v1"] as const;

/**
 * First path segments that are application routes, not a person slug. A path
 * `/{segment}/{id}` with any other first segment is a public CV.
 */
const RESERVED_FIRST_SEGMENTS = new Set([
  "admin",
  "api",
  "cv-templates",
  "dashboard",
  "docs",
  "login",
  "master-resume",
  "onboarding",
  "privacy",
  "resume",
  "settings",
  "terms",
  "user",
]);

const AI_BOT_PATTERN = new RegExp(
  AI_BOT_USER_AGENTS.map((token) => token.replace(/[-]/g, "\\-")).join("|"),
  "i",
);

export function isAiBotUserAgent(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent) && AI_BOT_PATTERN.test(userAgent as string);
}

export function isMachineSurfacePath(pathname: string): boolean {
  return MACHINE_SURFACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPublicCvPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && !RESERVED_FIRST_SEGMENTS.has(segments[0].toLowerCase());
}

export function isAiBotBlockedPath(pathname: string): boolean {
  return isMachineSurfacePath(pathname) || isPublicCvPath(pathname);
}

export function shouldBlockAiBot(userAgent: string | null | undefined, pathname: string): boolean {
  return isAiBotUserAgent(userAgent) && isAiBotBlockedPath(pathname);
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

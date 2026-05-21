/**
 * Simple in-memory rate limiter for development/local testing.
 * NOTE: In serverless/distributed environments (Vercel, Netlify), 
 * this should be replaced with a Redis-backed solution (e.g., Upstash).
 */

const rateLimitMap = new Map<string, { count: number; reset: number }>();

export type RateLimitOptions = {
  interval: number; // ms
  limit: number;
};

export function rateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + options.interval });
    return { success: true, count: 1, reset: now + options.interval };
  }

  if (record.count >= options.limit) {
    return { success: false, count: record.count, reset: record.reset };
  }

  record.count += 1;
  return { success: true, count: record.count, reset: record.reset };
}

/**
 * Distributed rate limiter backed by Postgres (see migration
 * 20260825000000_distributed_rate_limiting.sql). Every serverless instance
 * shares the same counter via an atomic RPC.
 *
 * There is deliberately no in-memory adapter: the store is always the RPC
 * unless a test injects one explicitly.
 */

import { createHash } from "node:crypto";

export type RateLimitOptions = {
  interval: number; // ms
  limit: number;
};

export type RateLimitResult = {
  success: boolean;
  count: number;
  reset: number; // epoch ms
  storeError?: boolean;
};

export type RateLimitStore = (key: string, options: RateLimitOptions) => Promise<RateLimitResult | null>;

type CheckRateLimitRow = {
  allowed: boolean;
  count: number;
  reset_at: string;
};

const rpcStore: RateLimitStore = async (key, options) => {
  const { callRpc } = await import("./supabase-http");
  const result = await callRpc<CheckRateLimitRow[]>({
    functionName: "check_rate_limit",
    payload: { p_key: key, p_interval_ms: options.interval, p_limit: options.limit },
    useServiceRole: true,
  });
  const row = result.data?.[0];
  if (!row) return null;
  return { success: row.allowed, count: row.count, reset: new Date(row.reset_at).getTime() };
};

export async function rateLimit(
  key: string,
  options: RateLimitOptions,
  store: RateLimitStore = rpcStore,
): Promise<RateLimitResult> {
  try {
    const result = await store(key, options);
    if (result) return result;
  } catch {
    // falls through to the store-error result
  }
  return { success: false, count: 0, reset: Date.now() + options.interval, storeError: true };
}

export type RateLimitDimension = {
  /** ip | user | email | resource … — part of the key, never logged raw */
  dim: string;
  value: string;
  interval: number;
  limit: number;
};

export type EnforceOptions = {
  action: string;
  limits: RateLimitDimension[];
  /**
   * What to do when the counter store is unreachable.
   * "closed" (default): refuse with 503 — auth, destructive, expensive, admin.
   * "open": allow — low-risk public reads only, where availability wins.
   */
  onStoreError?: "closed" | "open";
  /** 429 body text; `extra` is merged into the 429 body (e.g. docsUrl). */
  message?: string;
  extra?: Record<string, unknown>;
  store?: RateLimitStore;
};

// Values (emails, IPs, user ids) are hashed so the counter table and logs never hold them raw.
function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function logEvent(event: string, action: string, dim: string): void {
  console.warn(JSON.stringify({ type: "security", event, action, dim }));
}

/** Returns a 429/503 Response to send, or null when the request may proceed. */
export async function enforceRateLimit(options: EnforceOptions): Promise<Response | null> {
  const { action, limits, onStoreError = "closed", store, message, extra } = options;
  for (const l of limits) {
    const result = await rateLimit(`${action}:${l.dim}:${hashValue(l.value)}`, l, store);
    if (result.storeError) {
      logEvent("rate_limit_store_error", action, l.dim);
      if (onStoreError === "open") continue;
      return Response.json(
        { error: "Service temporarily unavailable. Try again shortly.", code: "rate_limit_unavailable" },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    if (!result.success) {
      logEvent("rate_limited", action, l.dim);
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      return Response.json(
        { error: message ?? "Too many requests. Try again later.", code: "rate_limited", ...extra },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }
  return null;
}

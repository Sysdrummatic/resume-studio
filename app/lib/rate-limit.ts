/**
 * Distributed rate limiter backed by Postgres (see migration
 * 20260825000000_distributed_rate_limiting.sql). Every serverless instance
 * shares the same counter via an atomic RPC — replaces the previous
 * in-process Map, which reset on every cold start and never coordinated
 * across instances.
 */

import { callRpc } from "./supabase-http";

export type RateLimitOptions = {
  interval: number; // ms
  limit: number;
};

export type RateLimitResult = {
  success: boolean;
  count: number;
  reset: number; // epoch ms
};

type CheckRateLimitRow = {
  allowed: boolean;
  count: number;
  reset_at: string;
};

export async function rateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const result = await callRpc<CheckRateLimitRow[]>({
    functionName: "check_rate_limit",
    payload: { p_key: key, p_interval_ms: options.interval, p_limit: options.limit },
    useServiceRole: true,
  });

  const row = result.data?.[0];
  if (!row) {
    // ponytail: fail OPEN. A Postgres/network hiccup here shouldn't take down
    // signin or exports for every user — Supabase Auth and app-level
    // validation remain the primary defenses on the endpoints that use this.
    console.error("[rate-limit] check_rate_limit RPC failed, failing open:", result.error);
    return { success: true, count: 0, reset: Date.now() + options.interval };
  }

  return {
    success: row.allowed,
    count: row.count,
    reset: new Date(row.reset_at).getTime(),
  };
}

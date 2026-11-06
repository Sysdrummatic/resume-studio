/**
 * Client IP from platform-set headers only. `x-forwarded-for` is never read:
 * clients can send any value and the platform appends rather than replaces it,
 * so it would let an attacker pick their own rate-limit bucket.
 *
 * A header is trusted only on the platform that overwrites it, detected from
 * the runtime env (a spoofed `x-nf-client-connection-ip` is ignored on Vercel
 * and vice versa). Unknown platform / header missing → shared "unknown" bucket,
 * which fails safe (stricter, not looser).
 */
export const UNKNOWN_CLIENT_IP = "unknown";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

function validIp(value: string | null): string | null {
  const ip = value?.split(",")[0]?.trim() ?? "";
  return ip.length <= 45 && (IPV4.test(ip) || (ip.includes(":") && IPV6.test(ip))) ? ip : null;
}

export function getClientIp(
  headers: Pick<Headers, "get">,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.NETLIFY === "true") return validIp(headers.get("x-nf-client-connection-ip")) ?? UNKNOWN_CLIENT_IP;
  if (env.VERCEL) return validIp(headers.get("x-vercel-forwarded-for")) ?? UNKNOWN_CLIENT_IP;
  return UNKNOWN_CLIENT_IP;
}

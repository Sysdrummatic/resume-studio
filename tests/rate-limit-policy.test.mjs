import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { enforceRateLimit } from "../app/lib/rate-limit.ts";
import { getClientIp, UNKNOWN_CLIENT_IP } from "../app/lib/client-ip.ts";

// Test-only counter shared by "instances" the way the Postgres RPC is shared.
function fakeStore(now = () => Date.now()) {
  const rows = new Map();
  const keys = [];
  const store = async (key, { interval, limit }) => {
    keys.push(key);
    let row = rows.get(key);
    if (!row || row.reset <= now()) row = { count: 0, reset: now() + interval };
    row.count += 1;
    rows.set(key, row);
    return { success: row.count <= limit, count: row.count, reset: row.reset };
  };
  return { store, keys };
}

const spec = (store, value = "1.1.1.1", extra = {}) => ({
  action: "t",
  limits: [{ dim: "ip", value, interval: 60_000, limit: 2 }],
  store,
  ...extra,
});

test("allows up to the limit, then 429 with Retry-After and a stable code", async () => {
  const { store } = fakeStore();
  assert.equal(await enforceRateLimit(spec(store)), null);
  assert.equal(await enforceRateLimit(spec(store)), null);
  const res = await enforceRateLimit(spec(store));
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get("Retry-After")) >= 1);
  assert.equal((await res.json()).code, "rate_limited");
});

test("window reset releases the limit", async () => {
  let t = 1_000;
  const { store } = fakeStore(() => t);
  await enforceRateLimit(spec(store));
  await enforceRateLimit(spec(store));
  assert.equal((await enforceRateLimit(spec(store))).status, 429);
  t += 60_001;
  assert.equal(await enforceRateLimit(spec(store)), null);
});

test("keys are isolated per value and action, and never contain the raw value", async () => {
  const { store, keys } = fakeStore();
  await enforceRateLimit(spec(store, "a@example.com"));
  await enforceRateLimit(spec(store, "a@example.com"));
  assert.equal(await enforceRateLimit(spec(store, "b@example.com")), null);
  assert.equal(await enforceRateLimit({ ...spec(store, "a@example.com"), action: "other" }), null);
  assert.ok(keys.every((k) => !k.includes("example.com")));
});

test("two simulated function instances share one counter", async () => {
  const { store } = fakeStore();
  await enforceRateLimit(spec(store)); // instance A
  await enforceRateLimit(spec(store)); // instance B
  assert.equal((await enforceRateLimit(spec(store))).status, 429); // instance A again
});

test("store failure: fail-closed by default (503), fail-open when asked", async () => {
  const broken = async () => {
    throw new Error("db down");
  };
  const closed = await enforceRateLimit(spec(broken));
  assert.equal(closed.status, 503);
  assert.equal((await closed.json()).code, "rate_limit_unavailable");
  assert.ok(closed.headers.get("Retry-After"));
  assert.equal(await enforceRateLimit(spec(broken, "x", { onStoreError: "open" })), null);
  assert.equal((await enforceRateLimit(spec(async () => null))).status, 503);
});

test("429 body does not leak the key or internals", async () => {
  const { store } = fakeStore();
  for (let i = 0; i < 2; i++) await enforceRateLimit(spec(store, "secret@example.com"));
  const body = JSON.stringify(await (await enforceRateLimit(spec(store, "secret@example.com"))).json());
  assert.equal(body.includes("secret@example.com"), false);
});

test("client IP: x-forwarded-for is never trusted", () => {
  const h = new Headers({ "x-forwarded-for": "6.6.6.6" });
  assert.equal(getClientIp(h, { NETLIFY: "true" }), UNKNOWN_CLIENT_IP);
  assert.equal(getClientIp(h, { VERCEL: "1" }), UNKNOWN_CLIENT_IP);
  assert.equal(getClientIp(h, {}), UNKNOWN_CLIENT_IP);
});

test("client IP: only the header of the detected platform is used", () => {
  const nf = new Headers({ "x-nf-client-connection-ip": "203.0.113.7" });
  const vc = new Headers({ "x-vercel-forwarded-for": "198.51.100.9" });
  assert.equal(getClientIp(nf, { NETLIFY: "true" }), "203.0.113.7");
  assert.equal(getClientIp(vc, { VERCEL: "1" }), "198.51.100.9");
  assert.equal(getClientIp(nf, { VERCEL: "1" }), UNKNOWN_CLIENT_IP); // spoofed Netlify header on Vercel
  assert.equal(getClientIp(vc, { NETLIFY: "true" }), UNKNOWN_CLIENT_IP);
  assert.equal(getClientIp(new Headers({ "x-nf-client-connection-ip": "not-an-ip" }), { NETLIFY: "true" }), UNKNOWN_CLIENT_IP);
});

test("contract: no route reads x-forwarded-for or the raw rateLimit helper", () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk("app").filter((p) => /\.(ts|tsx)$/.test(p) && !p.endsWith("client-ip.ts"))) {
    const src = fs.readFileSync(f, "utf8");
    assert.equal(/x-forwarded-for/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), false, f);
    if (f.includes(`${path.sep}api${path.sep}`)) assert.equal(/\brateLimit\(/.test(src), false, f);
  }
});

test("contract: sensitive endpoints are covered", () => {
  const covered = [
    "auth/signin", "auth/signup", "auth/reset-password", "auth/resend-verification", "auth/update-password", "auth/session",
    "resume/import-file", "resume/transfer/import", "resume/transfer/export",
    "resume/export/pdf/preview", "resume/export/pdf", "resume/export/text", "resume/export/yaml", "resume/export/cvac",
    "public/opencv/v1/[personSlug]/[publicId]", "user/account", "admin/users/[userId]", "admin/access-restriction",
  ];
  for (const r of covered) {
    assert.ok(fs.readFileSync(`app/api/${r}/route.ts`, "utf8").includes("enforceRateLimit("), r);
  }
});

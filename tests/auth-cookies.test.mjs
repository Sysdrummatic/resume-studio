import test from "node:test";
import assert from "node:assert/strict";

import { setAuthCookies } from "../app/lib/auth-cookies.ts";

function buildCookieStore() {
  const writes = [];
  return {
    writes,
    get() {
      return undefined;
    },
    set(name, value, options) {
      writes.push({ name, value, options });
    },
  };
}

function buildSession() {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: "user-id",
    },
  };
}

test("setAuthCookies keeps host-only cookies outside production app env", () => {
  const previousAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const previousCookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  process.env.NEXT_PUBLIC_APP_ENV = "preview";
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN = "opencvhub.netlify.app";

  const cookieStore = buildCookieStore();
  setAuthCookies(cookieStore, buildSession());

  assert.equal(cookieStore.writes.length, 2);
  assert.equal(cookieStore.writes[0].options?.domain, undefined);
  assert.equal(cookieStore.writes[1].options?.domain, undefined);

  process.env.NEXT_PUBLIC_APP_ENV = previousAppEnv;
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN = previousCookieDomain;
});

test("setAuthCookies applies configured cookie domain in production app env", () => {
  const previousAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const previousCookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  process.env.NEXT_PUBLIC_APP_ENV = "production";
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN = "opencvhub.netlify.app";

  const cookieStore = buildCookieStore();
  setAuthCookies(cookieStore, buildSession());

  assert.equal(cookieStore.writes.length, 2);
  assert.equal(cookieStore.writes[0].options?.domain, "opencvhub.netlify.app");
  assert.equal(cookieStore.writes[1].options?.domain, "opencvhub.netlify.app");

  process.env.NEXT_PUBLIC_APP_ENV = previousAppEnv;
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN = previousCookieDomain;
});

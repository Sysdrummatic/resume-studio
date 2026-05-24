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

function withEnv(patch, callback) {
  const keys = Object.keys(patch);
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    for (const key of keys) {
      const value = patch[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    callback();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("setAuthCookies keeps host-only cookies outside production app env", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_ENV: "preview",
      CONTEXT: "deploy-preview",
      NEXT_PUBLIC_COOKIE_DOMAIN: "OpenCiVera.netlify.app",
    },
    () => {
      const cookieStore = buildCookieStore();
      setAuthCookies(cookieStore, buildSession());

      assert.equal(cookieStore.writes.length, 2);
      assert.equal(cookieStore.writes[0].options?.domain, undefined);
      assert.equal(cookieStore.writes[1].options?.domain, undefined);
    },
  );
});

test("setAuthCookies keeps host-only cookies for preview when app env is missing", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_ENV: undefined,
      CONTEXT: "deploy-preview",
      NEXT_PUBLIC_COOKIE_DOMAIN: "OpenCiVera.netlify.app",
    },
    () => {
      const cookieStore = buildCookieStore();
      setAuthCookies(cookieStore, buildSession());

      assert.equal(cookieStore.writes.length, 2);
      assert.equal(cookieStore.writes[0].options?.domain, undefined);
      assert.equal(cookieStore.writes[1].options?.domain, undefined);
    },
  );
});

test("setAuthCookies applies configured cookie domain in production app env", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_ENV: "production",
      CONTEXT: "production",
      NEXT_PUBLIC_COOKIE_DOMAIN: "OpenCiVera.netlify.app",
    },
    () => {
      const cookieStore = buildCookieStore();
      setAuthCookies(cookieStore, buildSession());

      assert.equal(cookieStore.writes.length, 2);
      assert.equal(cookieStore.writes[0].options?.domain, "OpenCiVera.netlify.app");
      assert.equal(cookieStore.writes[1].options?.domain, "OpenCiVera.netlify.app");
    },
  );
});

test("setAuthCookies applies configured cookie domain in production deploy context when app env is missing", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_ENV: undefined,
      CONTEXT: "production",
      NEXT_PUBLIC_COOKIE_DOMAIN: "OpenCiVera.netlify.app",
    },
    () => {
      const cookieStore = buildCookieStore();
      setAuthCookies(cookieStore, buildSession());

      assert.equal(cookieStore.writes.length, 2);
      assert.equal(cookieStore.writes[0].options?.domain, "OpenCiVera.netlify.app");
      assert.equal(cookieStore.writes[1].options?.domain, "OpenCiVera.netlify.app");
    },
  );
});

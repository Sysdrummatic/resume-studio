import test from "node:test";
import assert from "node:assert/strict";

import { getAppBaseUrl, getSupabaseProjectRef } from "../app/lib/env.ts";

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

test("getSupabaseProjectRef extracts the Supabase project ref from URL", () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklm.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    },
    () => {
      assert.equal(getSupabaseProjectRef(), "abcdefghijklm");
    },
  );
});

test("getSupabaseProjectRef falls back to host when URL is not supabase.co", () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://db.internal.example.com",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    },
    () => {
      assert.equal(getSupabaseProjectRef(), "db.internal.example.com");
    },
  );
});

test("getAppBaseUrl prioritizes explicit NEXT_PUBLIC_APP_BASE_URL override", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_BASE_URL: "https://custom.example.com/",
      CONTEXT: "deploy-preview",
      DEPLOY_PRIME_URL: "https://deploy-preview-22--opencvhub.netlify.app",
      URL: "https://opencvhub.netlify.app",
    },
    () => {
      assert.equal(getAppBaseUrl(), "https://custom.example.com");
    },
  );
});

test("getAppBaseUrl uses DEPLOY_PRIME_URL for deploy preview context", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_BASE_URL: undefined,
      CONTEXT: "deploy-preview",
      DEPLOY_PRIME_URL: "https://deploy-preview-54--opencvhub.netlify.app/",
      URL: "https://opencvhub.netlify.app",
    },
    () => {
      assert.equal(getAppBaseUrl(), "https://deploy-preview-54--opencvhub.netlify.app");
    },
  );
});

test("getAppBaseUrl uses production URL in production context", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_BASE_URL: undefined,
      CONTEXT: "production",
      DEPLOY_PRIME_URL: "https://deploy-preview-54--opencvhub.netlify.app",
      URL: "https://opencvhub.netlify.app/",
    },
    () => {
      assert.equal(getAppBaseUrl(), "https://opencvhub.netlify.app");
    },
  );
});

test("getAppBaseUrl falls back to localhost when no Netlify URL env is available", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_BASE_URL: undefined,
      CONTEXT: undefined,
      DEPLOY_PRIME_URL: undefined,
      DEPLOY_URL: undefined,
      URL: undefined,
    },
    () => {
      assert.equal(getAppBaseUrl(), "http://localhost:3000");
    },
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import { getSupabaseProjectRef } from "../app/lib/env.ts";

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

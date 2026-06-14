import test from "node:test";
import assert from "node:assert/strict";

import { sendEmail } from "../app/lib/email.ts";

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
    return callback();
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

function withMockedFetch(callback) {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "mock-id" }), { status: 200 });
  };

  try {
    return callback(calls);
  } finally {
    global.fetch = originalFetch;
  }
}

test("sendEmail is a no-op when RESEND_API_KEY is unset", async () => {
  await withEnv({ RESEND_API_KEY: undefined, EMAIL_FROM_ADDRESS: "OpenCiVera <noreply@opencivera.com>" }, async () => {
    await withMockedFetch(async (calls) => {
      const result = await sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" });

      assert.deepEqual(result, { sent: false, reason: "not_configured" });
      assert.equal(calls.length, 0);
    });
  });
});

test("sendEmail is a no-op when EMAIL_FROM_ADDRESS is unset", async () => {
  await withEnv({ RESEND_API_KEY: "re_test_key", EMAIL_FROM_ADDRESS: undefined }, async () => {
    await withMockedFetch(async (calls) => {
      const result = await sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" });

      assert.equal(result.sent, false);
      assert.equal(calls.length, 0);
    });
  });
});

test("sendEmail posts to Resend when both env vars are configured", async () => {
  await withEnv({ RESEND_API_KEY: "re_test_key", EMAIL_FROM_ADDRESS: "OpenCiVera <noreply@opencivera.com>" }, async () => {
    await withMockedFetch(async (calls) => {
      const result = await sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" });

      assert.deepEqual(result, { sent: true });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.resend.com/emails");
      assert.equal(calls[0].init.method, "POST");
      assert.equal(calls[0].init.headers.Authorization, "Bearer re_test_key");

      const body = JSON.parse(calls[0].init.body);
      assert.equal(body.from, "OpenCiVera <noreply@opencivera.com>");
      assert.equal(body.to, "user@example.com");
      assert.equal(body.subject, "Test");
      assert.equal(body.html, "<p>Test</p>");
    });
  });
});

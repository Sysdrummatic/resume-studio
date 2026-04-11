import test from "node:test";
import assert from "node:assert/strict";

import { requestJsonResult } from "../app/lib/http-request-result.ts";

test("requestJsonResult returns parsed data for 200 JSON", async () => {
  const result = await requestJsonResult(
    async () =>
      new Response(JSON.stringify({ ok: true, id: "u1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    {
      networkErrorMessage: "Network unavailable.",
      httpErrorFallback: "Auth failed.",
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.error, null);
  assert.deepEqual(result.data, { ok: true, id: "u1" });
});

test("requestJsonResult returns fallback for non-JSON 500", async () => {
  const result = await requestJsonResult(async () => new Response("", { status: 500 }), {
    networkErrorMessage: "Network unavailable.",
    httpErrorFallback: "Auth failed.",
  });

  assert.equal(result.status, 500);
  assert.equal(result.error, "Auth failed.");
  assert.equal(result.data, null);
});

test("requestJsonResult returns controlled error when request throws", async () => {
  const result = await requestJsonResult(
    async () => {
      throw new Error("socket timeout");
    },
    {
      networkErrorMessage: "Authentication service is temporarily unavailable. Try again.",
      httpErrorFallback: "Auth failed.",
    },
  );

  assert.equal(result.status, 503);
  assert.equal(result.error, "Authentication service is temporarily unavailable. Try again.");
  assert.equal(result.data, null);
});

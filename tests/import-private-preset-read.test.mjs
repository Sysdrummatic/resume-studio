import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { fetchPrivateResumePresetIdsForUser } = await import("../app/lib/resume-server.ts");

test("import preset lookup distinguishes a failed read from an empty list", async (t) => {
  const fake = installFakePostgrest({
    resume_presets: [
      { id: "private", user_id: "owner", is_public: false },
      { id: "published", user_id: "owner", is_public: true },
      { id: "someone-else", user_id: "other", is_public: false },
    ],
  }, {
    onRequest: ({ method, path }) => method === "GET" && path === "resume_presets"
      ? new Response(JSON.stringify({ message: "unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } })
      : undefined,
  });
  t.after(() => fake.restore());
  assert.equal(await fetchPrivateResumePresetIdsForUser("owner"), null);
});

test("import preset lookup returns only the owner's private versions", async (t) => {
  const fake = installFakePostgrest({
    resume_presets: [
      { id: "private", user_id: "owner", is_public: false },
      { id: "published", user_id: "owner", is_public: true },
      { id: "someone-else", user_id: "other", is_public: false },
    ],
  });
  t.after(() => fake.restore());
  assert.deepEqual(await fetchPrivateResumePresetIdsForUser("owner"), ["private"]);
  assert.deepEqual(await fetchPrivateResumePresetIdsForUser("new-user"), []);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { presetStyleSource } = await import("../app/lib/resume-style.ts");

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const documentStyle = { template: "document" };

test("a saved CV version without its own style uses its document's style", () => {
  // `{}` is the column default: versions created before per-version styles, or
  // by code that never wrote one. They must look like their publications did.
  assert.equal(presetStyleSource({}, documentStyle), documentStyle);
  assert.equal(presetStyleSource(undefined, documentStyle), documentStyle);
  assert.equal(presetStyleSource(null, documentStyle), documentStyle);
  assert.deepEqual(presetStyleSource({ template: "own" }, documentStyle), { template: "own" });
});

test("the dashboard, the version editor and the publish trigger apply the same fallback", () => {
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const server = read("app/lib/resume-server.ts");
  const migration = read("supabase/migrations/20260926000000_preset_style_inherits_document.sql");

  assert.doesNotMatch(dashboard, /preset\??\.style_settings \?\?/);
  assert.doesNotMatch(server, /preset\??\.style_settings \?\?/);
  assert.match(dashboard, /presetStyleSource\(/);
  assert.match(server, /presetStyleSource\(/);
  assert.match(migration, /nullif\(p\.style_settings, '\{\}'::jsonb\)/);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("public CV indexing flag is seeded disabled by a migration", () => {
  const migration = fs.readdirSync(path.join(process.cwd(), "supabase/migrations"))
    .filter((name) => name.endsWith("_public_cv_indexing_flag.sql"))
    .map((name) => read(`supabase/migrations/${name}`))
    .join("\n");
  assert.match(migration, /'public_cv_indexing_enabled',\s*false/);
  assert.match(migration, /on conflict \(key\) do nothing/);
});

test("indexing flag fails closed while generic flags stay fail-open", () => {
  const flags = read("app/lib/platform-feature-flags.ts");
  assert.match(flags, /isFeatureFlagEnabled\(key: string, fallback = true\)/);
  assert.match(flags, /isFeatureFlagEnabled\(PUBLIC_CV_INDEXING_FLAG_KEY, false\)/);
  assert.equal(flags.includes('"public_cv_indexing_enabled"'), true);
});

test("effective allowIndexing is resolved in one place and used by every public surface", () => {
  const server = read("app/lib/resume-server.ts");
  assert.match(server, /resolveEffectiveAllowIndexing\(link: \{ allow_indexing\?: boolean \| null \}\)/);
  assert.match(server, /Boolean\(link\.allow_indexing\) && \(await isPublicCvIndexingEnabled\(\)\)/);
  assert.equal((server.match(/allowIndexing: await resolveEffectiveAllowIndexing\(link\)/g) || []).length, 2);
  assert.equal(server.includes("allowIndexing: Boolean(link.allow_indexing)"), false);
  const sitemapFn = server.slice(server.indexOf("export async function fetchIndexablePublicLinksForSitemap"));
  assert.match(sitemapFn.slice(0, 250), /if \(!\(await isPublicCvIndexingEnabled\(\)\)\) \{\s*return \[\];/);

  const page = read("app/[personSlug]/[publicId]/page.tsx");
  assert.match(page, /index: allowIndexing/);
  assert.match(page, /\{allowIndexing \? \(/);
});

test("publishing and saving ignore allow_indexing=true while the flag is off", () => {
  const server = read("app/lib/resume-server.ts");
  assert.match(server, /allow_indexing: Boolean\(payload\.allowIndexing\) && \(await isPublicCvIndexingEnabled\(\)\)/);
  assert.match(server, /input_allow_indexing: payload\.allowIndexing && \(await isPublicCvIndexingEnabled\(\)\)/);
});

test("indexing controls are hidden unless the flag is on and copy exists in EN and PL", () => {
  const modal = read("app/components/PublishSavedVersionModal.tsx");
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const page = read("app/dashboard/page.tsx");
  assert.match(modal, /indexingEnabled \? \(\s*<label className="checkbox-row">/);
  assert.match(dashboard, /indexingEnabled \? \(\s*<label className="checkbox-row">/);
  assert.match(dashboard, /indexingEnabled = false/);
  assert.match(page, /indexingEnabled=\{indexingEnabled\}/);
  for (const locale of ["en", "pl"]) {
    const yaml = read(`app/i18n/locales/${locale}/dashboard.yaml`);
    assert.equal((yaml.match(/link_only_note:/g) || []).length, 2);
  }
});

test("sitemap links and effective indexing follow the flag at runtime (off, missing row, on)", async (t) => {
  const { register } = await import("node:module");
  register("./helpers/ts-extension-resolve.mjs", import.meta.url);
  const { installFakePostgrest } = await import("./helpers/fake-postgrest.mjs");
  const link = {
    id: "link-1", person_slug: "jan", public_id: "abc", status: "active", is_active: true,
    default_locale: "en", available_locales: ["en"], allow_indexing: true, updated_at: "2026-10-01T00:00:00Z",
  };
  const { fetchIndexablePublicLinksForSitemap, resolveEffectiveAllowIndexing } = await import("../app/lib/resume-server.ts");

  for (const [flagRows, expected] of [
    [[{ key: "public_cv_indexing_enabled", enabled: false }], false],
    [[], false],
    [[{ key: "public_cv_indexing_enabled", enabled: true }], true],
  ]) {
    const fake = installFakePostgrest({ resume_public_links: [link], platform_feature_flags: flagRows });
    try {
      assert.equal((await fetchIndexablePublicLinksForSitemap()).length, expected ? 1 : 0);
      assert.equal(await resolveEffectiveAllowIndexing(link), expected);
      assert.equal(await resolveEffectiveAllowIndexing({ allow_indexing: false }), false);
    } finally {
      fake.restore();
    }
  }
});

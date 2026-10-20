import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// ADR 0026: every mutation that changes what a public link serves must expire the cache.
const INVALIDATING = [
  ["app/lib/resume-server.ts", "revalidatePublicCv", 2],
  ["app/api/user/account/route.ts", "revalidatePublicCv", 1],
  ["app/api/admin/users/[userId]/route.ts", "revalidatePublicCv", 1],
  ["app/api/admin/access-restriction/route.ts", "revalidateAccessRestriction", 1],
];

for (const [file, helper, calls] of INVALIDATING) {
  test(`${file} calls ${helper} ${calls}x`, () => {
    const source = read(file);
    assert.match(source, new RegExp(`import \{[^}]*${helper}[^}]*\} from "[./]+/(lib/)?public-cache-invalidation"|from "./public-cache-invalidation"`));
    assert.equal(source.split(`${helper}();`).length - 1, calls);
  });
}

test("the publish and unpublish RPCs invalidate only after they succeed", () => {
  const source = read("app/lib/resume-server.ts");
  assert.match(source, /publish_resume_saved_version returned no data"\);\s+revalidatePublicCv\(\);/);
  assert.match(source, /if \(rpcResult\.error \|\| !rpcResult\.data\) return null;\s+revalidatePublicCv\(\);/);
});

test("public CV pages read through the cached resolver, never the raw fetch", () => {
  for (const file of ["app/[personSlug]/[publicId]/page.tsx", "app/[personSlug]/[publicId]/opengraph-image.tsx"]) {
    const source = read(file);
    assert.match(source, /getPublishedRoute\(/, file);
    assert.doesNotMatch(source, /fetchPublishedResumePresetByPublicLink/, file);
  }
});

test("the cached resolver is keyed by slug, id and locale, tagged, and never caches a miss", () => {
  const source = read("app/lib/public-data-cache.ts");
  assert.match(source, /async \(personSlug: string, publicId: string, locale: string \| undefined\)/);
  assert.match(source, /tags: \[PUBLIC_CV_CACHE_TAG\]/);
  assert.match(source, /if \(!route\) throw new NotPublishedError\(\)/);
});

test("the layout reads the access restriction through the cache; auth routes stay uncached", () => {
  assert.match(read("app/layout.tsx"), /getCachedAccessRestriction\(\)/);
  for (const file of ["app/api/auth/signin/route.ts", "app/api/auth/signup/route.ts", "app/login/page.tsx"]) {
    assert.doesNotMatch(read(file), /getCachedAccessRestriction/, file);
  }
});

test("session-keyed readers do not use the public data cache", () => {
  for (const file of ["app/dashboard/page.tsx", "app/master-resume/page.tsx", "app/lib/auth-server.ts"]) {
    assert.doesNotMatch(read(file), /public-data-cache/, file);
  }
});

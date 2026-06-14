import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const removedStaticEntryPoints = [
  "public/login.html",
  "public/dashboard.html",
  "public/master-resume.html",
  "public/resume.html",
  "public/user.html",
  "public/editor-preview.html",
  "public/landing-styles-test.html",
  "public/r/index.html",
];

const removedStaticAssets = [
  "public/scripts/auth.js",
  "public/scripts/auth-config.js",
  "public/scripts/auth-config.example.js",
  "public/scripts/admin-config.js",
  "public/scripts/editor-preview-renderer.js",
  "public/scripts/main.js",
  "public/scripts/master-resume-editor.js",
  "public/scripts/protected.js",
  "public/scripts/public-resume.js",
  "public/scripts/status-toast.js",
  "public/styles/auth.css",
  "public/styles/general.css",
  "public/styles/landing.css",
  "public/styles/master-resume-editor.css",
  "public/styles/status-toast.css",
];

function exists(relativePath) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("legacy static HTML entry points and browser scripts are removed", () => {
  for (const relativePath of [...removedStaticEntryPoints, ...removedStaticAssets]) {
    assert.equal(exists(relativePath), false, `${relativePath} should not exist`);
  }
});

test("HTML compatibility is preserved through Next redirects", () => {
  const netlifyConfig = read("netlify.toml");
  const redirects = [
    ["/index.html", "/"],
    ["/login.html", "/login"],
    ["/dashboard.html", "/dashboard"],
    ["/master-resume.html", "/master-resume"],
    ["/resume.html", "/resume"],
    ["/user.html", "/user"],
    ["/r/index.html", "/resume"],
  ];

  for (const [from, to] of redirects) {
    assert.equal(netlifyConfig.includes(`from = "${from}"`), true, `${from} redirect source is missing`);
    assert.equal(netlifyConfig.includes(`to = "${to}"`), true, `${from} redirect target is missing`);
  }
  assert.equal((netlifyConfig.match(/status = 301/g) || []).length >= redirects.length, true);
  assert.equal((netlifyConfig.match(/force = true/g) || []).length >= redirects.length, true);
});

test("public resume slugs are handled by the React route", () => {
  const route = read("app/r/[slug]/page.tsx");
  const server = read("app/lib/resume-server.ts");

  assert.equal(route.includes("fetchCanonicalPublicPathBySlug"), true);
  assert.equal(route.includes("permanentRedirect"), true);
  assert.equal(route.includes("fetchPublishedResumePresetBySlug"), true);
  assert.equal(route.includes("BasicResumeDocument"), true);
  assert.equal(route.includes("robots"), true);
  assert.equal(server.includes("fetchCanonicalPublicPathBySlug"), true);
  assert.equal(server.includes("buildResumeDocumentFromPreset"), true);
  assert.equal(server.includes('table: "resume_public_links"'), true);
});

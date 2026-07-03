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

test("netlify.toml contains only the build config and Next.js plugin", () => {
  const netlifyConfig = read("netlify.toml");
  assert.equal(netlifyConfig.includes("npm run build"), true);
  assert.equal(netlifyConfig.includes("@netlify/plugin-nextjs"), true);
  assert.equal(netlifyConfig.includes(".html"), false, "legacy .html redirects should be removed");
});

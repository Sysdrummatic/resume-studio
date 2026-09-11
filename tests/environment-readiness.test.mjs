import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import {
  formatEnvironmentReport,
  validateEnvironment
} from "../scripts/qa/environment-readiness.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(repositoryRoot, "scripts", "qa", "environment-readiness.mjs");

const validPreviewEnvironment = {
  NEXT_PUBLIC_APP_ENV: "preview",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key-value",
  SUPABASE_SERVICE_ROLE_KEY: "secret-service-role-value",
  NEXT_PUBLIC_APP_BASE_URL: "https://deploy-preview.example.netlify.app"
};

test("accepts a complete preview environment", () => {
  const result = validateEnvironment("preview", validPreviewEnvironment);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("reports missing, placeholder and invalid hosted values by variable name", () => {
  const result = validateEnvironment("production", {
    NEXT_PUBLIC_APP_ENV: "preview",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "replace-me"
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.map(({ variable }) => variable),
    [
      "NEXT_PUBLIC_APP_ENV",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY"
    ]
  );
});

test("requires both email variables when email delivery is configured", () => {
  const result = validateEnvironment("preview", {
    ...validPreviewEnvironment,
    RESEND_API_KEY: "resend-secret-value"
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.map(({ variable }) => variable),
    ["EMAIL_FROM_ADDRESS"]
  );
});

test("formatted reports never include environment values", () => {
  const secret = "must-not-appear-in-output";
  const result = validateEnvironment("preview", {
    ...validPreviewEnvironment,
    SUPABASE_SERVICE_ROLE_KEY: secret,
    RESEND_API_KEY: secret
  });

  const report = formatEnvironmentReport(result);

  assert.equal(report.includes(secret), false);
  assert.match(report, /EMAIL_FROM_ADDRESS/);
});

test("CLI fails closed without printing secret values", () => {
  const secret = "cli-secret-must-stay-hidden";
  const run = spawnSync(process.execPath, [scriptPath, "--target=production"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NEXT_PUBLIC_APP_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key-value",
      SUPABASE_SERVICE_ROLE_KEY: secret,
      RESEND_API_KEY: secret
    }
  });

  assert.equal(run.status, 1);
  assert.match(run.stdout, /EMAIL_FROM_ADDRESS/);
  assert.equal(`${run.stdout}${run.stderr}`.includes(secret), false);
});

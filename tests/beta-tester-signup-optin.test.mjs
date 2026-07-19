import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const clientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");
const routePath = path.join(process.cwd(), "app", "api", "auth", "signup", "route.ts");
const httpPath = path.join(process.cwd(), "app", "lib", "supabase-http.ts");
const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260719000000_beta_tester_signup_optin.sql",
);

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("signup form renders the beta-tester opt-in checkbox above the policy checkbox", () => {
  const source = read(clientPath);
  const betaIndex = source.indexOf("I&apos;m joining as a beta-tester");
  const policyIndex = source.indexOf("I have read and accept the");

  assert.equal(betaIndex >= 0, true);
  assert.equal(policyIndex >= 0, true);
  assert.equal(betaIndex < policyIndex, true);
});

test("beta opt-in checkbox is optional and unchecked by default", () => {
  const source = read(clientPath);

  assert.equal(source.includes("const [signupBetaOptIn, setSignupBetaOptIn] = useState(false)"), true);
  const checkboxBlock = source.slice(
    source.indexOf("checked={signupBetaOptIn}"),
    source.indexOf("I&apos;m joining as a beta-tester"),
  );
  assert.equal(checkboxBlock.includes("required"), false);
});

test("signup submit payload includes the beta opt-in boolean", () => {
  const source = read(clientPath);

  assert.equal(source.includes("wantsBetaTestUser: signupBetaOptIn"), true);
});

test("signup API route forwards the opt-in to signUpWithPassword", () => {
  const source = read(routePath);

  assert.equal(source.includes("wantsBetaTestUser?: boolean"), true);
  assert.equal(source.includes("body.wantsBetaTestUser === true"), true);
  assert.equal(/signUpWithPassword\(email, password, emailRedirectTo, wantsBetaTestUser\)/.test(source), true);
});

test("signUpWithPassword sends wants_beta_test_user in the signup metadata", () => {
  const source = read(httpPath);
  const fnStart = source.indexOf("export async function signUpWithPassword");
  const fnEnd = source.indexOf("export async function resendVerificationEmail");
  const fnBody = source.slice(fnStart, fnEnd);

  assert.equal(fnBody.includes("wantsBetaTestUser: boolean"), true);
  assert.equal(fnBody.includes("wants_beta_test_user: wantsBetaTestUser"), true);
});

test("migration sets is_test_user from signup metadata on profile insert only", () => {
  const source = read(migrationPath);

  assert.equal(source.includes("create or replace function public.handle_new_auth_user()"), true);
  assert.equal(source.includes("raw_user_meta_data ->> 'wants_beta_test_user'"), true);
  assert.equal(/insert into public\.profiles \([^)]*is_test_user/.test(source), true);
  assert.equal(source.includes("update public.profiles"), false);
});

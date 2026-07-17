import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260712000000_login_restriction_flag.sql");
const libPath = path.join(process.cwd(), "app", "lib", "access-restriction.ts");
const adminRoutePath = path.join(process.cwd(), "app", "api", "admin", "access-restriction", "route.ts");
const signinRoutePath = path.join(process.cwd(), "app", "api", "auth", "signin", "route.ts");
const signupRoutePath = path.join(process.cwd(), "app", "api", "auth", "signup", "route.ts");
const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
const headerNavPath = path.join(process.cwd(), "app", "components", "app-header-navigation.tsx");
const loginPagePath = path.join(process.cwd(), "app", "login", "page.tsx");
const loginClientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");
const accountMenuPath = path.join(process.cwd(), "app", "components", "account-menu.tsx");
const modalPath = path.join(process.cwd(), "app", "components", "beta-test-mode-modal.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("migration adds reason column and seeds login_restricted flag disabled", () => {
  const source = read(migrationPath);

  assert.equal(source.includes("add column reason text"), true);
  assert.equal(source.includes("'login_restricted'"), true);
  assert.equal(source.includes("values ('login_restricted', false"), true);
  assert.equal(source.includes("on conflict (key) do nothing"), true);
});

test("access-restriction helper fails closed to not-restricted and allowlists two reasons", () => {
  const source = read(libPath);

  assert.equal(source.includes('return { restricted: false, reason: "" };'), true);
  const catchIndex = source.indexOf("catch");
  assert.notEqual(catchIndex, -1);
  assert.equal(source.slice(catchIndex).includes("restricted: false"), true);
  assert.equal(source.includes("Access is temporarily unavailable while we deploy a new feature."), true);
  assert.equal(source.includes("Access is temporarily unavailable while we implement beta test results."), true);
  assert.equal(source.includes("isAllowedRestrictionReason"), true);
});

test("admin access-restriction route requires admin for writes and validates the reason", () => {
  const source = read(adminRoutePath);

  assert.equal(source.includes("requireRequestActor"), true);
  assert.equal(/actorResult\.actor\.role !== "admin"/.test(source), true);
  assert.equal(source.includes("isAllowedRestrictionReason(body.reason)"), true);
  assert.equal(source.includes('action: "platform.login_restriction_updated"'), true);
});

test("signin route blocks non-staff during restriction and lets staff through", () => {
  const source = read(signinRoutePath);

  assert.equal(source.includes("getAccessRestriction"), true);
  assert.equal(source.includes("!isStaffRole(profileResult.data.role)"), true);

  const restrictionIndex = source.indexOf("getAccessRestriction()");
  const signOutAfterRestriction = source.slice(restrictionIndex).includes("signOut(session.access_token)");
  assert.equal(signOutAfterRestriction, true, "restricted sign-in must end the just-created session");
  assert.equal(source.slice(restrictionIndex).includes("status: 403"), true);
});

test("signup route blocks all signups during restriction before any Supabase call", () => {
  const source = read(signupRoutePath);

  const restrictionIndex = source.indexOf("getAccessRestriction()");
  const signUpIndex = source.indexOf("signUpWithPassword(");
  assert.notEqual(restrictionIndex, -1);
  assert.notEqual(signUpIndex, -1);
  assert.ok(restrictionIndex < signUpIndex, "restriction check must run before sign-up call");
  assert.equal(source.includes("{ error: restriction.reason }"), true);
});

test("header disables guest Sign in/Sign up with a tooltip reason during restriction", () => {
  const layoutSource = read(layoutPath);
  const navSource = read(headerNavPath);

  assert.equal(layoutSource.includes("getAccessRestriction"), true);
  assert.equal(layoutSource.includes("disabled: restriction.restricted"), true);
  assert.equal(layoutSource.includes("disabledReason: restriction.reason"), true);

  assert.equal(navSource.includes("app-nav__action--disabled"), true);
  assert.equal(navSource.includes('role="tooltip"'), true);
  assert.equal(navSource.includes("nav-tooltip"), true);
  assert.equal(navSource.includes('aria-disabled="true"'), true);
});

test("login page threads restriction into the client and disables submit buttons with tooltip", () => {
  const pageSource = read(loginPagePath);
  const clientSource = read(loginClientPath);

  assert.equal(pageSource.includes("getAccessRestriction()"), true);
  assert.equal(pageSource.includes("restricted={restriction.restricted}"), true);

  assert.equal(clientSource.includes("RestrictedSubmitButton"), true);
  assert.equal(clientSource.includes('role="tooltip"'), true);
  assert.equal((clientSource.match(/RestrictedSubmitButton/g) || []).length >= 3, true, "both sign-in and sign-up use the restricted button");
  assert.equal(clientSource.includes("if (restricted) {"), true);
});

test("account menu exposes Beta test mode only for admin and opens the management modal", () => {
  const menuSource = read(accountMenuPath);
  const modalSource = read(modalPath);

  assert.equal(menuSource.includes("isAdminRole(role) && ("), true);
  assert.equal(menuSource.includes("Beta test mode"), true);
  assert.equal(menuSource.includes("BetaTestModeModal"), true);

  assert.equal(modalSource.includes("Restrict access"), true);
  assert.equal(modalSource.includes("/api/admin/access-restriction"), true);
  assert.equal(modalSource.includes("<select"), true);
  assert.equal(modalSource.includes('role="dialog"'), true);
});

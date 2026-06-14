import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const routePath = path.join(process.cwd(), "app", "api", "user", "account", "route.ts");
const accountMenuPath = path.join(process.cwd(), "app", "components", "account-menu.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("DELETE /api/user/account derives the target account only from the caller's session", () => {
  const source = read(routePath);

  assert.equal(source.includes("requireRequestActor()"), true, "Must resolve the actor from the session.");
  assert.equal(source.includes("actorResult.actor"), true);
  assert.equal(source.includes("request.json"), false, "Must not read a request body to select a target user.");
  assert.equal(/deleteAuthUserAsService\(\s*userId\s*\)/.test(source), true);
});

test("DELETE /api/user/account deletes the auth user before sending the confirmation email", () => {
  const source = read(routePath);

  const deleteIndex = source.indexOf("deleteAuthUserAsService(");
  const emailIndex = source.indexOf("sendEmail(");

  assert.notEqual(deleteIndex, -1, "Must call deleteAuthUserAsService.");
  assert.notEqual(emailIndex, -1, "Must call sendEmail.");
  assert.ok(deleteIndex < emailIndex, "Account deletion must happen before the confirmation email is sent.");
});

test("DELETE /api/user/account captures the caller's email before the auth user is deleted", () => {
  const source = read(routePath);

  const destructureIndex = source.indexOf("const { userId, email } = actorResult.actor;");
  const deleteIndex = source.indexOf("deleteAuthUserAsService(");
  const emailIndex = source.indexOf("sendEmail(");

  assert.notEqual(destructureIndex, -1, "Must capture email from the actor before deletion.");
  assert.ok(destructureIndex < deleteIndex);
  assert.ok(destructureIndex < emailIndex);

  const emailCallSnippet = source.slice(emailIndex, emailIndex + 200);
  assert.equal(emailCallSnippet.includes("to: email"), true, "Confirmation email must use the pre-deletion email address.");
});

test("DELETE /api/user/account does not reference admin_audit_logs or a new account-lifecycle table", () => {
  const source = read(routePath);

  assert.equal(source.includes("admin_audit_logs"), false);
  assert.equal(source.includes("account_deletion_log"), false);
  assert.equal(source.includes("writeAdminAuditLog"), false);
});

test("Profile modal gates the destructive delete behind a two-step, type-to-confirm flow", () => {
  const source = read(accountMenuPath);

  assert.equal(source.includes("isDeleteConfirmOpen"), true, "Must track whether the confirmation step is revealed.");
  assert.equal(source.includes('fetch("/api/user/account", { method: "DELETE" })'), true);

  const handlerIndex = source.indexOf("async function handleDeleteAccount()");
  assert.notEqual(handlerIndex, -1);

  const buttonIndex = source.indexOf("Usuń konto na zawsze");
  const buttonSnippet = source.slice(buttonIndex - 400, buttonIndex + 100);
  assert.equal(
    buttonSnippet.includes("deleteConfirmInput.trim().toLowerCase() !== email.toLowerCase()"),
    true,
    "Final delete button must stay disabled until the typed email matches the account email.",
  );
});

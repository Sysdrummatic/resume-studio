import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("status toast renders status messages as a reusable browser-corner popup", () => {
  const component = read("app/components/status-toast.tsx");
  const styles = read("app/globals.css");

  assert.equal(component.includes("export function StatusToast"), true);
  assert.equal(component.includes("export function useStatusToast"), true);
  assert.equal(component.includes('type StatusToastVariant = "success" | "warning" | "error"'), true);
  assert.equal(component.includes("status-toast"), true);
  assert.equal(component.includes("window.setTimeout(startClose, 5000)"), true);
  assert.equal(component.includes("window.setTimeout(onClose, 180)"), true);
  assert.equal(component.includes('aria-label="Close notification"'), true);
  assert.equal(component.includes('role={toast.variant === "error" ? "alert" : "status"}'), true);
  assert.equal(component.includes('isClosing ? " status-toast--leaving" : ""'), true);
  assert.equal(styles.includes(".status-toast"), true);
  assert.equal(styles.includes("position: fixed;"), true);
  assert.equal(styles.includes("left: 1rem;"), true);
  assert.equal(styles.includes("bottom: 1rem;"), true);
  assert.equal(styles.includes("@keyframes status-toast-slide-in"), true);
  assert.equal(styles.includes("@keyframes status-toast-slide-out"), true);
  assert.equal(styles.includes(".status-toast--leaving"), true);
  assert.equal(styles.includes(".status-toast--success"), true);
  assert.equal(styles.includes(".status-toast--warning"), true);
  assert.equal(styles.includes(".status-toast--error"), true);
  assert.equal(styles.includes("#dcfce7"), true);
  assert.equal(styles.includes("#fef9c3"), true);
  assert.equal(styles.includes("#fee2e2"), true);
});

test("page-level status messages use the shared toast component", () => {
  const clients = [
    "app/dashboard/dashboard-client.tsx",
    "app/master-resume/editor-canvas-client.tsx",
    "app/admin/admin-users-client.tsx",
    "app/login/account-access-client.tsx",
    "app/resume/resume-view-client.tsx",
  ].map(read);

  for (const source of clients) {
    assert.equal(source.includes("StatusToast"), true);
    assert.equal(source.includes("useStatusToast"), true);
  }
});

test("destructive and warning statuses are routed to the expected toast variants", () => {
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const admin = read("app/admin/admin-users-client.tsx");
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const login = read("app/login/account-access-client.tsx");

  assert.equal(dashboard.includes('showToast("Preset deleted.", "error")'), true);
  assert.equal(admin.includes('showToast("User deleted.", "error")'), true);
  assert.equal(editor.includes('showToast("Draft cleared.", "error")'), true);
  assert.equal(editor.includes('showToast("No draft found for current locale.", "warning")'), true);
  assert.equal(login.includes('const contextualVariant = contextualMessage ? "warning" : "success";'), true);
});

test("legacy public pages load the shared static toast helper", () => {
  const pages = [
    "public/login.html",
    "public/dashboard.html",
    "public/master-resume.html",
    "public/r/index.html",
    "public/resume.html",
    "public/user.html",
  ].map(read);

  for (const page of pages) {
    assert.equal(page.includes("styles/status-toast.css"), true);
    assert.equal(page.includes("scripts/status-toast.js"), true);
  }
});

test("legacy public scripts route user-facing statuses through static toast helper", () => {
  const scripts = [
    "public/scripts/auth.js",
    "public/scripts/protected.js",
    "public/scripts/master-resume-editor.js",
    "public/scripts/public-resume.js",
    "public/scripts/main.js",
  ].map(read);

  for (const source of scripts) {
    assert.equal(source.includes("ResumeStatusToast"), true);
  }

  const publicResume = read("public/r/index.html");
  assert.equal(publicResume.includes('id="public-status" class="auth-status" role="status" aria-live="polite"></p>'), true);
});

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
  assert.equal(styles.includes("border-color: var(--portal-success-border)"), true);
  assert.equal(styles.includes("border-color: var(--portal-warning-border)"), true);
  assert.equal(styles.includes("border-color: var(--portal-danger-border)"), true);
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

  assert.equal(dashboard.includes('showToast("CV Version deleted.", "error")'), true);
  assert.equal(admin.includes('showToast("User deleted.", "error")'), true);
  assert.equal(editor.includes('showToast("Language list could not be refreshed.", "warning")'), true);
  assert.equal(editor.includes('showToast("Language version deleted.")'), true);
  assert.equal(login.includes('const contextualVariant = contextualMessage ? "warning" : "success";'), true);
});

test("legacy static toast helper has been removed from public assets", () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), "public", "styles", "status-toast.css")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "public", "scripts", "status-toast.js")), false);
});

import test from "node:test";
import assert from "node:assert/strict";

import { canAccessAdminArea, getEffectiveRoles, hasCapability, hasRole, isRoleAuthorized } from "../app/lib/rbac.ts";

test("user has only base role and own resume capabilities", () => {
  assert.deepEqual(getEffectiveRoles("user"), ["user"]);
  assert.equal(hasRole("user", "user"), true);
  assert.equal(hasRole("user", "manager"), false);
  assert.equal(hasCapability("user", "resume.document.read_own"), true);
  assert.equal(hasCapability("user", "admin.area.access"), false);
});

test("manager inherits user only", () => {
  assert.deepEqual(getEffectiveRoles("manager"), ["manager", "user"]);
  assert.equal(hasRole("manager", "user"), true);
  assert.equal(hasRole("manager", "recruiter"), false);
  assert.equal(hasCapability("manager", "resume.document.read_own"), true);
  assert.equal(hasCapability("manager", "admin.area.access"), true);
  assert.equal(hasCapability("manager", "admin.users.delete"), false);
});

test("recruiter inherits user only", () => {
  assert.deepEqual(getEffectiveRoles("recruiter"), ["recruiter", "user"]);
  assert.equal(hasRole("recruiter", "user"), true);
  assert.equal(hasRole("recruiter", "manager"), false);
  assert.equal(hasCapability("recruiter", "resume.document.read_own"), true);
  assert.equal(hasCapability("recruiter", "admin.area.access"), false);
});

test("admin inherits manager recruiter and user capabilities", () => {
  assert.deepEqual(getEffectiveRoles("admin"), ["admin", "manager", "user", "recruiter"]);
  assert.equal(hasRole("admin", "manager"), true);
  assert.equal(hasRole("admin", "recruiter"), true);
  assert.equal(hasRole("admin", "user"), true);
  assert.equal(hasCapability("admin", "admin.users.delete"), true);
  assert.equal(hasCapability("admin", "resume.document.read_own"), true);
  assert.equal(canAccessAdminArea("admin"), true);
  assert.equal(canAccessAdminArea("manager"), true);
  assert.equal(canAccessAdminArea("recruiter"), false);
});

test("acceptedRoles remains exact-match while capability checks use inheritance", () => {
  assert.equal(isRoleAuthorized("manager", { acceptedRoles: ["user"] }), false);
  assert.equal(isRoleAuthorized("manager", { anyCapability: "resume.document.read_own" }), true);
  assert.equal(
    isRoleAuthorized("admin", {
      allCapabilities: ["admin.area.access", "resume.document.read_own"],
    }),
    true,
  );
});

test("private content access is not broadened for inherited roles", () => {
  for (const role of ["user", "manager", "recruiter", "admin"]) {
    assert.equal(hasCapability(role, "resume.content.read_other"), false);
    assert.equal(isRoleAuthorized(role, { anyCapability: "resume.content.read_other" }), false);
  }
});

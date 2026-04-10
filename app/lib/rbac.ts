import type { AppRole } from "./auth-types";

type ManageDecision = {
  allowed: boolean;
  reason: string | null;
};

const MANAGER_MANAGEABLE_ROLES: ReadonlySet<AppRole> = new Set(["user", "recruiter"]);

export function canAccessAdminArea(role: AppRole): boolean {
  return role === "admin" || role === "manager";
}

export function canDeleteTarget(actorRole: AppRole, targetRole: AppRole): boolean {
  if (actorRole === "admin") {
    return true;
  }
  if (actorRole === "manager") {
    return MANAGER_MANAGEABLE_ROLES.has(targetRole);
  }
  return false;
}

export function canAssignRole(actorRole: AppRole, targetRole: AppRole, nextRole: AppRole): ManageDecision {
  if (actorRole === "admin") {
    return { allowed: true, reason: null };
  }

  if (actorRole !== "manager") {
    return { allowed: false, reason: "Only admin or manager can update roles." };
  }

  if (!MANAGER_MANAGEABLE_ROLES.has(targetRole)) {
    return { allowed: false, reason: "Manager can modify only user/recruiter accounts." };
  }

  if (!MANAGER_MANAGEABLE_ROLES.has(nextRole)) {
    return { allowed: false, reason: "Manager cannot promote roles to manager/admin." };
  }

  return { allowed: true, reason: null };
}

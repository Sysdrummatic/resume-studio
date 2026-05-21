import type { AppCapability, AppRole, RequestActorAuthorizationOptions } from "./auth-types";

type ManageDecision = {
  allowed: boolean;
  reason: string | null;
};

const MANAGER_MANAGEABLE_ROLES: ReadonlySet<AppRole> = new Set(["user", "recruiter"]);
const NO_CAPABILITIES: readonly AppCapability[] = [];

const ROLE_INHERITS: Readonly<Record<AppRole, readonly AppRole[]>> = {
  admin: ["manager", "recruiter"],
  manager: ["user"],
  recruiter: ["user"],
  user: [],
};

const ROLE_CAPABILITIES: Readonly<Record<AppRole, readonly AppCapability[]>> = {
  admin: [
    "admin.area.access",
    "admin.analytics.read",
    "admin.audit.read",
    "admin.users.read",
    "admin.users.role_write",
    "admin.users.status_write",
    "admin.users.delete",
  ],
  manager: ["admin.area.access", "admin.analytics.read", "admin.audit.read", "admin.users.read"],
  recruiter: NO_CAPABILITIES,
  user: [
    "resume.document.read_own",
    "resume.document.write_own",
    "resume.language.read_own",
    "resume.language.write_own",
    "resume.preset.read_own",
    "resume.preset.write_own",
    "resume.preset.publish_own",
    "resume.preset.unpublish_own",
    "resume.revision.rollback_own",
  ],
};

export function getEffectiveRoles(role: AppRole): AppRole[] {
  const visited = new Set<AppRole>();
  const ordered: AppRole[] = [];

  function visit(currentRole: AppRole) {
    if (visited.has(currentRole)) {
      return;
    }

    visited.add(currentRole);
    ordered.push(currentRole);

    for (const inheritedRole of ROLE_INHERITS[currentRole]) {
      visit(inheritedRole);
    }
  }

  visit(role);
  return ordered;
}

export function hasRole(actorRole: AppRole, requiredRole: AppRole): boolean {
  return getEffectiveRoles(actorRole).includes(requiredRole);
}

export function getCapabilitiesForRole(role: AppRole): AppCapability[] {
  const capabilities = new Set<AppCapability>();

  for (const effectiveRole of getEffectiveRoles(role)) {
    for (const capability of ROLE_CAPABILITIES[effectiveRole]) {
      capabilities.add(capability);
    }
  }

  return [...capabilities];
}

export function hasCapability(actorRole: AppRole, capability: AppCapability): boolean {
  return getCapabilitiesForRole(actorRole).includes(capability);
}

export function isRoleAuthorized(actorRole: AppRole, options?: RequestActorAuthorizationOptions): boolean {
  if (!options) {
    return true;
  }

  if (options.acceptedRoles && !options.acceptedRoles.includes(actorRole)) {
    return false;
  }

  if (options.anyCapability && !hasCapability(actorRole, options.anyCapability)) {
    return false;
  }

  if (options.allCapabilities && options.allCapabilities.some((capability) => !hasCapability(actorRole, capability))) {
    return false;
  }

  return true;
}

export function canAccessAdminArea(role: AppRole): boolean {
  return hasCapability(role, "admin.area.access");
}

export function canDeleteTarget(actorRole: AppRole, targetRole: AppRole): boolean {
  if (hasCapability(actorRole, "admin.users.delete")) {
    return true;
  }
  if (hasCapability(actorRole, "admin.users.read")) {
    return MANAGER_MANAGEABLE_ROLES.has(targetRole);
  }
  return false;
}

export function canAssignRole(actorRole: AppRole, targetRole: AppRole, nextRole: AppRole): ManageDecision {
  if (hasCapability(actorRole, "admin.users.role_write")) {
    return { allowed: true, reason: null };
  }

  if (!hasCapability(actorRole, "admin.users.read")) {
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

export function isStaffRole(role: AppRole): boolean {
  return hasRole(role, "manager");
}

export function isNonStaffRole(role: AppRole): boolean {
  return MANAGER_MANAGEABLE_ROLES.has(role);
}

export function canAccessDraftPdf(role: AppRole): boolean {
  return role === "admin";
}

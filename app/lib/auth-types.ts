export const APP_ROLES = ["admin", "manager", "user", "recruiter"] as const;
export const APP_CAPABILITIES = [
  "admin.area.access",
  "admin.analytics.read",
  "admin.audit.read",
  "admin.users.read",
  "admin.users.role_write",
  "admin.users.status_write",
  "admin.users.delete",
  "resume.document.read_own",
  "resume.document.write_own",
  "resume.language.read_own",
  "resume.language.write_own",
  "resume.preset.read_own",
  "resume.preset.write_own",
  "resume.preset.publish_own",
  "resume.preset.unpublish_own",
  "resume.revision.rollback_own",
  "resume.content.read_other",
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type AppCapability = (typeof APP_CAPABILITIES)[number];
export type RequestActorAuthorizationOptions = {
  acceptedRoles?: readonly AppRole[];
  anyCapability?: AppCapability;
  allCapabilities?: readonly AppCapability[];
};

export type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

export type SupabaseSessionResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseAuthUser;
};

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  person_slug: string | null;
  name_sync_mode: "auto" | "manual" | null;
  avatar_url: string | null;
  role: AppRole;
  bio: string | null;
  is_active: boolean;
  is_test_user: boolean;
  is_ocv_staff: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SessionActor = {
  userId: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  firstName: string;
  lastName: string;
  personSlug: string | null;
  nameSyncMode: "auto" | "manual";
  avatarUrl: string | null;
  role: AppRole;
  bio: string | null;
  isActive: boolean;
  isTestUser: boolean;
  accessToken: string;
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

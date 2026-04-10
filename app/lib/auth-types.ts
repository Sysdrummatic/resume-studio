export const APP_ROLES = ["admin", "manager", "user", "recruiter"] as const;

export type AppRole = (typeof APP_ROLES)[number];

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
  role: AppRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SessionActor = {
  userId: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  role: AppRole;
  isActive: boolean;
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

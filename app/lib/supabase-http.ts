import { getSupabasePublicConfig, getSupabaseServerConfig } from "./env";
import type { ProfileRecord, SupabaseAuthUser, SupabaseSessionResponse } from "./auth-types";
import { requestJsonResult } from "./http-request-result";

type AuthResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

type SupabaseAuthUsersResponse = {
  users?: Array<{
    id: string;
    email?: string | null;
    created_at?: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
  }>;
};

const NETWORK_ERROR_MESSAGE = "Authentication service is temporarily unavailable. Try again.";
const PROFILE_SELECT =
  "id,display_name,first_name,last_name,person_slug,name_sync_mode,avatar_url,role,bio,is_active,is_test_user,is_ocv_staff,created_at,updated_at";

function buildHeaders(
  options: {
    accessToken?: string;
    useServiceRole?: boolean;
    contentType?: string;
    prefer?: string;
  } = {},
): Headers {
  const publicConfig = getSupabasePublicConfig();
  const headers = new Headers();
  const apikey = options.useServiceRole ? getSupabaseServerConfig().serviceRoleKey : publicConfig.anonKey;
  headers.set("apikey", apikey);
  // PostgREST derives the Postgres role from the Authorization JWT, not the apikey header.
  // When the service role is requested it must win the Authorization header; otherwise a
  // caller-supplied user token silently downgrades the request to `authenticated` and RLS applies.
  const authToken = options.useServiceRole ? apikey : options.accessToken || apikey;
  headers.set("Authorization", `Bearer ${authToken}`);
  if (options.contentType) {
    headers.set("Content-Type", options.contentType);
  }
  if (options.prefer) {
    headers.set("Prefer", options.prefer);
  }
  return headers;
}

async function requestSupabase<T>(
  executeRequest: () => Promise<Response>,
  httpErrorFallback: string,
): Promise<AuthResult<T>> {
  return requestJsonResult<T>(executeRequest, {
    networkErrorMessage: NETWORK_ERROR_MESSAGE,
    httpErrorFallback,
  });
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult<SupabaseSessionResponse>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<SupabaseSessionResponse>(
    () =>
      fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: buildHeaders({ contentType: "application/json" }),
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      }),
    "Sign in failed.",
  );
}

export async function signUpWithPassword(
  email: string,
  password: string,
  emailRedirectTo: string,
  wantsBetaTestUser: boolean,
): Promise<AuthResult<SupabaseSessionResponse>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<SupabaseSessionResponse>(
    () =>
      fetch(`${url}/auth/v1/signup`, {
        method: "POST",
        headers: buildHeaders({ contentType: "application/json" }),
        body: JSON.stringify({
          email,
          password,
          email_redirect_to: emailRedirectTo,
          data: { wants_beta_test_user: wantsBetaTestUser },
        }),
        cache: "no-store",
      }),
    "Sign up failed.",
  );
}

export async function resendVerificationEmail(
  email: string,
  emailRedirectTo: string,
): Promise<AuthResult<Record<string, unknown>>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<Record<string, unknown>>(
    () =>
      fetch(`${url}/auth/v1/resend`, {
        method: "POST",
        headers: buildHeaders({ contentType: "application/json" }),
        body: JSON.stringify({
          type: "signup",
          email,
          email_redirect_to: emailRedirectTo,
        }),
        cache: "no-store",
      }),
    "Verification email could not be sent.",
  );
}

export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string,
): Promise<AuthResult<Record<string, unknown>>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<Record<string, unknown>>(
    () =>
      fetch(`${url}/auth/v1/recover`, {
        method: "POST",
        headers: buildHeaders({ contentType: "application/json" }),
        body: JSON.stringify({ email, redirect_to: redirectTo }),
        cache: "no-store",
      }),
    "Password reset request failed.",
  );
}

export async function signOut(accessToken: string): Promise<void> {
  const { url } = getSupabasePublicConfig();
  await requestSupabase<Record<string, unknown>>(
    () =>
      fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        headers: buildHeaders({ accessToken }),
        cache: "no-store",
      }),
    "Sign out failed.",
  );
}

export async function refreshSession(refreshToken: string): Promise<AuthResult<SupabaseSessionResponse>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<SupabaseSessionResponse>(
    () =>
      fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: buildHeaders({ contentType: "application/json" }),
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      }),
    "Session refresh failed.",
  );
}

export async function getAuthUser(accessToken: string): Promise<AuthResult<SupabaseAuthUser>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<SupabaseAuthUser>(
    () =>
      fetch(`${url}/auth/v1/user`, {
        method: "GET",
        headers: buildHeaders({ accessToken }),
        cache: "no-store",
      }),
    "Unable to read authenticated user.",
  );
}

type QueryTableOptions = {
  table: string;
  select: string;
  accessToken?: string;
  useServiceRole?: boolean;
  query?: string;
};

export async function queryTable<T>({
  table,
  select,
  accessToken,
  useServiceRole,
  query,
}: QueryTableOptions): Promise<AuthResult<T[]>> {
  const { url } = getSupabasePublicConfig();
  const encodedSelect = encodeURIComponent(select);
  const querySuffix = query ? `&${query}` : "";
  return requestSupabase<T[]>(
    () =>
      fetch(`${url}/rest/v1/${table}?select=${encodedSelect}${querySuffix}`, {
        method: "GET",
        headers: buildHeaders({ accessToken, useServiceRole }),
        cache: "no-store",
      }),
    "Unable to query data.",
  );
}

type UpdateTableOptions = {
  table: string;
  values: Record<string, unknown>;
  query: string;
  accessToken?: string;
  useServiceRole?: boolean;
};

export async function updateTable({
  table,
  values,
  query,
  accessToken,
  useServiceRole,
}: UpdateTableOptions): Promise<AuthResult<Record<string, unknown>[]>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<Record<string, unknown>[]>(
    () =>
      fetch(`${url}/rest/v1/${table}?${query}`, {
        method: "PATCH",
        headers: buildHeaders({
          accessToken,
          useServiceRole,
          contentType: "application/json",
          prefer: "return=representation",
        }),
        body: JSON.stringify(values),
        cache: "no-store",
      }),
    "Unable to update data.",
  );
}

type DeleteTableOptions = {
  table: string;
  query: string;
  accessToken?: string;
  useServiceRole?: boolean;
};

export async function deleteTable({
  table,
  query,
  accessToken,
  useServiceRole,
}: DeleteTableOptions): Promise<AuthResult<Record<string, unknown>[]>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<Record<string, unknown>[]>(
    () =>
      fetch(`${url}/rest/v1/${table}?${query}`, {
        method: "DELETE",
        headers: buildHeaders({
          accessToken,
          useServiceRole,
          prefer: "return=representation",
        }),
        cache: "no-store",
      }),
    "Unable to delete data.",
  );
}

type InsertTableOptions = {
  table: string;
  values: Record<string, unknown> | Record<string, unknown>[];
  accessToken?: string;
  useServiceRole?: boolean;
  signal?: AbortSignal;
};

export async function insertTable({
  table,
  values,
  accessToken,
  useServiceRole,
  signal,
}: InsertTableOptions): Promise<AuthResult<Record<string, unknown>[]>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<Record<string, unknown>[]>(
    () =>
      fetch(`${url}/rest/v1/${table}`, {
        method: "POST",
        headers: buildHeaders({
          accessToken,
          useServiceRole,
          contentType: "application/json",
          prefer: "return=representation",
        }),
        body: JSON.stringify(values),
        cache: "no-store",
        signal,
      }),
    "Unable to insert data.",
  );
}

export async function fetchProfileById(userId: string, accessToken: string): Promise<AuthResult<ProfileRecord>> {
  const result = await queryTable<ProfileRecord>({
    table: "profiles",
    select: PROFILE_SELECT,
    accessToken,
    query: `id=eq.${encodeURIComponent(userId)}&limit=1`,
  });

  return {
    data: result.data?.[0] ?? null,
    error: result.error,
    status: result.status,
  };
}

export async function fetchProfileByIdAsService(userId: string): Promise<AuthResult<ProfileRecord>> {
  const result = await queryTable<ProfileRecord>({
    table: "profiles",
    select: PROFILE_SELECT,
    useServiceRole: true,
    query: `id=eq.${encodeURIComponent(userId)}&limit=1`,
  });

  return {
    data: result.data?.[0] ?? null,
    error: result.error,
    status: result.status,
  };
}

export async function fetchAllProfilesAsService(): Promise<AuthResult<ProfileRecord[]>> {
  return queryTable<ProfileRecord>({
    table: "profiles",
    select: PROFILE_SELECT,
    useServiceRole: true,
    query: "order=created_at.desc",
  });
}

export type PlatformStats = {
  total_users: number;
  active_users: number;
  total_resumes: number;
  total_public_links: number;
  total_public_views: number;
  excluded_test_users: number;
  excluded_staff_users: number;
};

export async function fetchPlatformStatsAsService(): Promise<AuthResult<PlatformStats>> {
  const result = await callRpc<PlatformStats[]>({
    functionName: "get_admin_platform_stats",
    useServiceRole: true,
  });

  return {
    data: result.data?.[0] ?? null,
    error: result.error,
    status: result.status,
  };
}

export async function fetchAuthUsersAsService(): Promise<AuthResult<SupabaseAuthUsersResponse>> {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  return requestSupabase<SupabaseAuthUsersResponse>(
    () =>
      fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
        method: "GET",
        headers: buildHeaders({
          useServiceRole: true,
          accessToken: serviceRoleKey,
        }),
        cache: "no-store",
      }),
    "Unable to read auth users.",
  );
}

export async function deleteAuthUserAsService(userId: string): Promise<AuthResult<Record<string, unknown>>> {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  return requestSupabase<Record<string, unknown>>(
    () =>
      fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: buildHeaders({
          useServiceRole: true,
          accessToken: serviceRoleKey,
        }),
        cache: "no-store",
      }),
    "Unable to delete user.",
  );
}

type CallRpcOptions = {
  functionName: string;
  payload?: Record<string, unknown>;
  accessToken?: string;
  useServiceRole?: boolean;
};

export async function updateUserPassword(
  accessToken: string,
  newPassword: string,
): Promise<AuthResult<Record<string, unknown>>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<Record<string, unknown>>(
    () =>
      fetch(`${url}/auth/v1/user`, {
        method: "PUT",
        headers: buildHeaders({ accessToken, contentType: "application/json" }),
        body: JSON.stringify({ password: newPassword }),
        cache: "no-store",
      }),
    "Password update failed.",
  );
}

export async function callRpc<T>({
  functionName,
  payload = {},
  accessToken,
  useServiceRole,
}: CallRpcOptions): Promise<AuthResult<T>> {
  const { url } = getSupabasePublicConfig();
  return requestSupabase<T>(
    () =>
      fetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
        method: "POST",
        headers: buildHeaders({
          accessToken,
          useServiceRole,
          contentType: "application/json",
        }),
        body: JSON.stringify(payload),
        cache: "no-store",
      }),
    "Unable to execute RPC.",
  );
}

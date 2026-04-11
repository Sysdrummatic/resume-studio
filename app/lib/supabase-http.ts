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
  headers.set("Authorization", `Bearer ${options.accessToken || apikey}`);
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
          options: { emailRedirectTo },
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
          options: { emailRedirectTo },
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
        body: JSON.stringify({ email, options: { redirectTo } }),
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

type InsertTableOptions = {
  table: string;
  values: Record<string, unknown> | Record<string, unknown>[];
  accessToken?: string;
  useServiceRole?: boolean;
};

export async function insertTable({
  table,
  values,
  accessToken,
  useServiceRole,
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
      }),
    "Unable to insert data.",
  );
}

export async function fetchProfileById(userId: string, accessToken: string): Promise<AuthResult<ProfileRecord>> {
  const result = await queryTable<ProfileRecord>({
    table: "profiles",
    select: "id,display_name,role,is_active,created_at,updated_at",
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
    select: "id,display_name,role,is_active,created_at,updated_at",
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
    select: "id,display_name,role,is_active,created_at,updated_at",
    useServiceRole: true,
    query: "order=created_at.desc",
  });
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

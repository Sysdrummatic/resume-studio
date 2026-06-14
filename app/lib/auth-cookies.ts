import type { SupabaseSessionResponse } from "./auth-types";

export const ACCESS_TOKEN_COOKIE = "resume_studio_access_token";
export const REFRESH_TOKEN_COOKIE = "resume_studio_refresh_token";

type CookieStore = {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      maxAge?: number;
      domain?: string;
    },
  ): void;
};

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

function isProductionCookieScope(): boolean {
  const appEnvironment = (process.env.NEXT_PUBLIC_APP_ENV || "").toLowerCase();
  if (appEnvironment) {
    return appEnvironment === "production";
  }

  const deployContext = (process.env.CONTEXT || process.env.VERCEL_ENV || "").toLowerCase();
  return deployContext === "production";
}

function getCookieDomain(): string | undefined {
  if (!isProductionCookieScope()) {
    return undefined;
  }

  const configuredDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  return configuredDomain ? configuredDomain : undefined;
}

export function readAuthTokens(cookieStore: CookieReader): AuthTokens {
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
  };
}

export function setAuthCookies(cookieStore: CookieStore, session: SupabaseSessionResponse): void {
  const maxAgeSeconds = Math.max(60, Number(session.expires_in || 3600));
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    domain: getCookieDomain(),
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, session.access_token, common);
  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(cookieStore: CookieStore): void {
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: getCookieDomain(),
    maxAge: 0,
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE, "", common);
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", common);
}

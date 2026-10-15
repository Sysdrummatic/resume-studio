type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

type SupabaseServerConfig = SupabasePublicConfig & {
  serviceRoleKey: string;
};

function readEnvValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `[env] Missing required environment variable: ${name}. ` +
      `Set it in your hosting provider's dashboard (e.g. Netlify Environment Variables).`,
    );
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return {
    url: readEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: readEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  return {
    ...getSupabasePublicConfig(),
    serviceRoleKey: readEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

const DEV_BASE_URL = "http://localhost:3000";

export function getAppBaseUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.URL || "").trim();
  if (!explicit) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing NEXT_PUBLIC_APP_BASE_URL (or Netlify URL): a production build needs the public https origin");
    }
    return DEV_BASE_URL;
  }
  if (!URL.canParse(explicit)) {
    throw new Error(`NEXT_PUBLIC_APP_BASE_URL is not a valid URL: "${explicit}" (include the https:// scheme)`);
  }
  const url = new URL(explicit);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_BASE_URL must use https:// in production");
  }
  return url.origin;
}

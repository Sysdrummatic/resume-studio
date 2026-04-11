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

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.URL;
  if (explicit) {
    return explicit;
  }
  return "http://localhost:3000";
}

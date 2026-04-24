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

export function getSupabaseProjectRef(): string {
  const { url } = getSupabasePublicConfig();
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const supabaseSuffix = ".supabase.co";
    if (hostname.endsWith(supabaseSuffix)) {
      return hostname.slice(0, -supabaseSuffix.length);
    }
    return hostname;
  } catch {
    return "unknown";
  }
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const context = (process.env.CONTEXT || "").toLowerCase();
  const deployPrimeUrl = process.env.DEPLOY_PRIME_URL?.trim();
  const deployUrl = process.env.DEPLOY_URL?.trim();
  const productionUrl = process.env.URL?.trim();

  if (context === "production" && productionUrl) {
    return productionUrl.replace(/\/+$/, "");
  }

  // Prefer DEPLOY_PRIME_URL whenever available outside production context.
  // This protects preview flows even if CONTEXT is missing/misreported.
  if (deployPrimeUrl) {
    return deployPrimeUrl.replace(/\/+$/, "");
  }

  if (deployUrl) {
    return deployUrl.replace(/\/+$/, "");
  }

  if (productionUrl) {
    return productionUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

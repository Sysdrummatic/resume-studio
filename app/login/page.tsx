import AccountAccessClient from "./account-access-client";

type InitialAuthMode = "signin" | "signup" | "reset";

type LoginPageProps = {
  searchParams: Promise<{
    reason?: string;
    verified?: string;
    mode?: string;
  }>;
};

export const dynamic = "force-dynamic";

function resolveAuthMode(value?: string): InitialAuthMode {
  if (value === "signup" || value === "reset") {
    return value;
  }

  return "signin";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <AccountAccessClient reason={params.reason || ""} verified={params.verified || ""} mode={resolveAuthMode(params.mode)} />;
}

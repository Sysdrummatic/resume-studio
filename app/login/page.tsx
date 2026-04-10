import AccountAccessClient from "./account-access-client";

type LoginPageProps = {
  searchParams: Promise<{
    reason?: string;
    verified?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <AccountAccessClient reason={params.reason || ""} verified={params.verified || ""} />;
}

import AccountAccessClient from "./account-access-client";
import type { Metadata } from "next";
import { getRequestAppI18n } from "../i18n/server";
import { getAccessRestriction } from "../lib/access-restriction";
import { publicPageMetadata } from "../lib/seo-metadata";

type InitialAuthMode = "signin" | "signup" | "reset";

type LoginPageProps = {
  searchParams: Promise<{
    reason?: string;
    verified?: string;
    mode?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  const restriction = await getAccessRestriction();
  return publicPageMetadata({ ...dictionary.meta.pages.login, path: "/login", index: !restriction.restricted });
}

function resolveAuthMode(value?: string): InitialAuthMode {
  if (value === "signup" || value === "reset") {
    return value;
  }

  return "signin";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [params, restriction] = await Promise.all([searchParams, getAccessRestriction()]);
  return (
    <AccountAccessClient
      reason={params.reason || ""}
      verified={params.verified || ""}
      mode={resolveAuthMode(params.mode)}
      restricted={restriction.restricted}
      restrictionReason={restriction.reason}
    />
  );
}

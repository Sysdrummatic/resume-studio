import AccountAccessClient from "./account-access-client";
import type { Metadata } from "next";
import { getRequestAppI18n } from "../i18n/server";
import { getAccessRestriction } from "../lib/access-restriction";
import { publicPageMetadata } from "../lib/seo-metadata";
import { resolveAuthMode } from "../lib/auth-mode";
import FloatingSheets from "../components/landing/floating-sheets";
import styles from "./login.module.css";

type LoginPageProps = {
  searchParams: Promise<{
    reason?: string;
    verified?: string;
    mode?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  const restriction = await getAccessRestriction();
  return publicPageMetadata({ ...dictionary.meta.pages.login, path: "/login", index: !restriction.restricted });
}

/* Presentation only (#290): the auth card, its forms and calls are AccountAccessClient, unchanged. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [params, restriction, { dictionary }] = await Promise.all([
    searchParams,
    getAccessRestriction(),
    getRequestAppI18n(),
  ]);
  const entry = dictionary.auth.entry;
  return (
    <div className={styles.entry}>
      <FloatingSheets />
      <div className={styles.copy}>
        <p className={styles.tag}>OpenCiVera</p>
        <h1 className={styles.title}>{entry.title}</h1>
        <p className={styles.free}>{entry.free_note}</p>
      </div>
      <AccountAccessClient
        reason={params.reason || ""}
        verified={params.verified || ""}
        mode={resolveAuthMode(params.mode)}
        restricted={restriction.restricted}
        restrictionReason={restriction.reason}
      />
    </div>
  );
}

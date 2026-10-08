import Script from "next/script";
import UserClient from "./user-client";
import { requireAdminActor } from "../lib/auth-server";
import {
  bootstrapResumeUserLocales,
  fetchResumeDocumentsForUser,
  fetchResumePresetsForUser,
  fetchResumeUserLocalesForUser,
  pickMasterResumeDocument
} from "../lib/resume-server";
import "./user.css";
import type { Metadata } from "next";
import { getRequestAppI18n } from "../i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    title: `${dictionary.user.text["Personal hub"]} | OpenCiVera`,
    robots: { index: false, follow: false }
  };
}

export default async function UserPage() {
  const actor = await requireAdminActor();
  await bootstrapResumeUserLocales(actor.accessToken, actor.userId, actor.displayName);
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const [resumePresets, resumeLanguages] = await Promise.all([
    fetchResumePresetsForUser(actor.userId),
    fetchResumeUserLocalesForUser(actor.userId)
  ]);
  const ownedLocaleCodes = new Set(resumeLanguages.map((language) => language.code));
  const ownedDocuments = resumeDocuments.filter((document) =>
    ownedLocaleCodes.has(document.locale)
  );
  const masterResume = pickMasterResumeDocument(ownedDocuments, resumeLanguages);

  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <UserClient
        actor={actor}
        masterResume={masterResume}
        initialDocuments={ownedDocuments}
        languageOptions={resumeLanguages}
        initialPresets={resumePresets}
      />
    </>
  );
}

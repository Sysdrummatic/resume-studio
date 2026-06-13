import Script from "next/script";
import UserClient from "./user-client";
import { requireAdminActor } from "../lib/auth-server";
import { bootstrapResumeUserLocales, fetchResumeDocumentsForUser, fetchResumePresetsForUser, fetchResumeUserLocalesForUser } from "../lib/resume-server";
import "./user.css";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const actor = await requireAdminActor();
  await bootstrapResumeUserLocales(actor.accessToken, actor.userId, actor.displayName);
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const [resumePresets, resumeLanguages] = await Promise.all([
    fetchResumePresetsForUser(actor.userId),
    fetchResumeUserLocalesForUser(actor.userId),
  ]);
  const ownedLocaleCodes = new Set(resumeLanguages.map((language) => language.code));
  const ownedDocuments = resumeDocuments.filter((document) => ownedLocaleCodes.has(document.locale));
  const masterResume = ownedDocuments.find((document) => document.locale === "en") || ownedDocuments[0] || null;

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

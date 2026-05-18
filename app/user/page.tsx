import Script from "next/script";
import UserClient from "./user-client";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { fetchResumeDocumentsForUser, fetchResumeLanguages, fetchResumePresetsForUser } from "../lib/resume-server";
import "./user.css";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const actor = await requireAuthenticatedActor();
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const [resumePresets, resumeLanguages] = await Promise.all([
    fetchResumePresetsForUser(actor.userId),
    fetchResumeLanguages({ enabledOnly: true }),
  ]);
  const masterResume = resumeDocuments.find((document) => document.locale === "en") || resumeDocuments[0] || null;

  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <UserClient 
        actor={actor}
        masterResume={masterResume} 
        initialDocuments={resumeDocuments} 
        languageOptions={resumeLanguages} 
        initialPresets={resumePresets} 
      />
    </>
  );
}

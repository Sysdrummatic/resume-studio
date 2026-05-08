import { requireAuthenticatedActor } from "../lib/auth-server";
import { fetchResumeLanguageVersionsForUser, fetchResumePresetsForUser } from "../lib/resume-server";
import LanguageVersionsClient from "./language-versions-client";

export const dynamic = "force-dynamic";

export default async function LanguageVersionsPage() {
  const actor = await requireAuthenticatedActor();
  const [languages, presets] = await Promise.all([
    fetchResumeLanguageVersionsForUser(actor.userId),
    fetchResumePresetsForUser(actor.userId),
  ]);
  const defaultLocale = presets.find((preset) => preset.is_public)?.default_locale || presets[0]?.default_locale || "en";

  return (
    <section className="stack">
      <header className="card card-header">
        <div>
          <h1>Language Versions</h1>
          <p className="card-lead">Create and manage resume language versions for {actor.displayName}.</p>
        </div>
      </header>
      <LanguageVersionsClient initialLanguages={languages} initialDefaultLocale={defaultLocale} />
    </section>
  );
}

import Link from "next/link";
import Script from "next/script";
import DashboardClient from "./dashboard-client";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { fetchResumeDocumentsForUser, fetchResumePresetsForUser } from "../lib/resume-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireAuthenticatedActor();
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);
  const resumePresets = await fetchResumePresetsForUser(actor.userId);
  const masterResume = resumeDocuments.find((document) => document.locale === "en") || resumeDocuments[0] || null;

  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <section className="card stack">
        <header className="card-header">
          <div>
            <h1>Dashboard</h1>
            <p className="card-lead">
              Logged in as <strong>{actor.displayName}</strong> ({actor.email}).
            </p>
          </div>
        </header>

        <div className="actions-row">
          <Link className="button button--ghost" href="/resume">
            View sample resume
          </Link>
        </div>
      </section>

      <DashboardClient masterResume={masterResume} initialPresets={resumePresets} />
    </>
  );
}

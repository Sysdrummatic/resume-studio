import Link from "next/link";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { fetchResumeDocumentsForUser } from "../lib/resume-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireAuthenticatedActor();
  const resumeDocuments = await fetchResumeDocumentsForUser(actor.userId);

  return (
    <div className="stack">
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
          <Link className="button button--primary" href="/master-resume">
            Open master resume editor
          </Link>
          <Link className="button button--ghost" href="/resume">
            View sample resume
          </Link>
        </div>
      </section>

      <section className="card stack">
        <div className="section-row">
          <h2>Resume documents</h2>
          <Link className="button button--ghost button--small" href="/master-resume">
            Edit
          </Link>
        </div>

        {resumeDocuments.length === 0 ? (
          <p className="card-lead">No resume documents saved yet.</p>
        ) : (
          <ul className="dashboard-resume-list">
            {resumeDocuments.map((document) => (
              <li key={document.id}>
                <div>
                  <strong>{document.title}</strong>
                  <p>
                    {document.locale.toUpperCase()} · Updated {new Date(document.updated_at).toLocaleString()}
                  </p>
                </div>
                <span className={`dashboard-resume-list__badge ${document.is_public ? "" : "dashboard-resume-list__badge--private"}`}>
                  {document.is_public ? "Public" : "Private"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

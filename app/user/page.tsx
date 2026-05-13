import Link from "next/link";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { fetchResumePresetsForUser } from "../lib/resume-server";
import { parseCanonicalPublicPath } from "../lib/resume-export";
import "./user.css";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const actor = await requireAuthenticatedActor();
  const presets = await fetchResumePresetsForUser(actor.userId);
  const publishedPresets = presets.filter((preset) => preset.is_public && preset.canonical_public_path);

  return (
    <div className="app-shell app-main">
      <header className="stack" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Account Overview</h1>
        <p className="card-lead">Manage your profile, published CV snapshots, and quick access to editing workflows.</p>
      </header>

      <div className="user-panel-layout">
        <div className="stack" style={{ gap: "2rem" }}>
          <section className="card stack">
            <div className="card-header">
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Personal Information</h2>
            </div>
            <div className="meta-grid">
              <p>
                <span className="meta-label">Display Name</span>
                <span className="meta-value">{actor.displayName || "Not specified"}</span>
              </p>
              <p>
                <span className="meta-label">Email Address</span>
                <span className="meta-value">{actor.email}</span>
              </p>
              <p>
                <span className="meta-label">System Role</span>
                <span className="meta-value">
                  <span className="resume-badge" style={{ textTransform: "uppercase" }}>
                    {actor.role}
                  </span>
                </span>
              </p>
              <p>
                <span className="meta-label">Email Status</span>
                <span className="meta-value" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {actor.emailConfirmed ? (
                    <>
                      <span style={{ color: "#4ade80" }}>o</span> Verified
                    </>
                  ) : (
                    "Pending"
                  )}
                </span>
              </p>
            </div>
          </section>

          <section className="card stack">
            <div className="card-header">
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Published CV Snapshots</h2>
              <Link href="/dashboard" className="button button--ghost button--small">
                Manage in Dashboard
              </Link>
            </div>
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>CV Version</th>
                    <th>Visibility</th>
                    <th>Snapshot URL</th>
                    <th style={{ textAlign: "right" }}>Exports</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedPresets.length > 0 ? (
                    publishedPresets.map((preset) => {
                      const exportPath = parseCanonicalPublicPath(preset.canonical_public_path);
                      const textHref = exportPath
                        ? `/api/resume/export/text?personSlug=${encodeURIComponent(exportPath.personSlug)}&publicId=${encodeURIComponent(exportPath.publicId)}&lang=${preset.default_locale}`
                        : null;
                      const pdfHref = exportPath
                        ? `/api/resume/export/pdf?personSlug=${encodeURIComponent(exportPath.personSlug)}&publicId=${encodeURIComponent(exportPath.publicId)}&lang=${preset.default_locale}`
                        : null;

                      return (
                        <tr key={preset.id}>
                          <td>
                            <strong>{preset.title}</strong>
                            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Updated {new Date(preset.updated_at).toLocaleString()}</div>
                          </td>
                          <td>
                            <span className="resume-badge">Published</span>{" "}
                            <span className={`resume-badge ${preset.allow_indexing ? "" : "dashboard-resume-list__badge--private"}`}>
                              {preset.allow_indexing ? "Indexable" : "Noindex"}
                            </span>
                          </td>
                          <td>{preset.canonical_public_path}</td>
                          <td style={{ textAlign: "right" }}>
                            <div className="actions-row" style={{ justifyContent: "flex-end" }}>
                              <a href={preset.canonical_public_path || "#"} target="_blank" rel="noopener noreferrer" className="button button--ghost button--small">
                                Open
                              </a>
                              {textHref ? (
                                <a href={textHref} className="button button--ghost button--small">
                                  ATS (TXT)
                                </a>
                              ) : null}
                              {pdfHref ? (
                                <a href={pdfHref} className="button button--ghost button--small">
                                  PDF
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                        No published CV snapshots yet. Publish a CV Version from Dashboard or Master Resume first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="stack" style={{ gap: "1rem" }}>
          <section className="card stack">
            <h3 style={{ margin: 0 }}>Quick Navigation</h3>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <Link href="/dashboard" className="button button--primary" style={{ textAlign: "center" }}>
                Dashboard
              </Link>
              <Link href="/master-resume" className="button button--ghost" style={{ textAlign: "center" }}>
                Master Resume
              </Link>
            </div>
          </section>

          <section className="card stack">
            <h3 style={{ margin: 0 }}>Account Status</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="account-status-dot account-status-dot--pulse"></div>
              <span style={{ fontSize: "0.9rem" }}>Account Active</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Snapshot exports are available only for published CV Versions to preserve privacy and revision isolation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

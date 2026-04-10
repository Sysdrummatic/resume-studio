import Link from "next/link";
import SignOutButton from "../components/signout-button";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { canAccessAdminArea } from "../lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireAuthenticatedActor();

  return (
    <section className="card stack">
      <header className="card-header">
        <div>
          <h1>Dashboard</h1>
          <p className="card-lead">
            Logged in as <strong>{actor.displayName}</strong> ({actor.email}).
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="meta-grid">
        <p>
          <span className="meta-label">Role</span>
          <span className="meta-value">{actor.role}</span>
        </p>
        <p>
          <span className="meta-label">Status</span>
          <span className="meta-value">{actor.isActive ? "active" : "inactive"}</span>
        </p>
        <p>
          <span className="meta-label">Email verification</span>
          <span className="meta-value">{actor.emailConfirmed ? "verified" : "pending"}</span>
        </p>
      </div>

      <div className="actions-row">
        <Link className="button button--primary" href="/master-resume">
          Open master resume editor
        </Link>
        <Link className="button button--ghost" href="/resume">
          View sample resume
        </Link>
        {canAccessAdminArea(actor.role) && (
          <Link className="button button--ghost" href="/admin">
            Open admin panel
          </Link>
        )}
      </div>
    </section>
  );
}

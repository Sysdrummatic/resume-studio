import Link from "next/link";
import { requireAuthenticatedActor } from "../lib/auth-server";

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
  );
}

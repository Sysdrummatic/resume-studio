import Link from "next/link";
import { requireAuthenticatedActor } from "../lib/auth-server";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const actor = await requireAuthenticatedActor();

  return (
    <section className="card stack">
      <h1>User panel</h1>
      <p className="card-lead">
        Account: <strong>{actor.email}</strong>, role: <strong>{actor.role}</strong>.
      </p>
      <p>Legacy route compatibility is preserved. Operational panel features are scheduled for Phase F.</p>
      <div className="actions-row">
        <Link className="button button--primary" href="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </section>
  );
}

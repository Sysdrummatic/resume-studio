import AdminUsersClient from "./admin-users-client";
import { requireStaffActor } from "../lib/auth-server";
import { fetchAllProfilesAsService, fetchAuthUsersAsService } from "../lib/supabase-http";
import type { AppRole } from "../lib/auth-types";

type UserOverview = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string | null;
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const actor = await requireStaffActor();
  const [profilesResult, authUsersResult] = await Promise.all([fetchAllProfilesAsService(), fetchAuthUsersAsService()]);

  const emailById = new Map<string, string>();
  const emailConfirmedById = new Map<string, boolean>();
  (authUsersResult.data?.users || []).forEach((user) => {
    emailById.set(user.id, user.email || "");
    emailConfirmedById.set(user.id, Boolean(user.email_confirmed_at));
  });

  let initialUsers: UserOverview[] = (profilesResult.data || []).map((profile) => ({
    id: profile.id,
    email: emailById.get(profile.id) || "",
    emailConfirmed: emailConfirmedById.get(profile.id) || false,
    displayName: profile.display_name || "",
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at || null,
  }));

  if (actor.role === "manager") {
    initialUsers = initialUsers.filter((user) => user.id === actor.userId || user.role === "user" || user.role === "recruiter");
  }

  const initialStats = {
    totalUsers: initialUsers.length,
    activeUsers: initialUsers.filter((user) => user.isActive).length,
    inactiveUsers: initialUsers.filter((user) => !user.isActive).length,
  };

  return (
    <section className="card stack">
      <header className="card-header">
        <div>
          <h1>Admin panel</h1>
          <p className="card-lead">
            Role: <strong>{actor.role}</strong>. Manage users, roles, activity and account deletion.
          </p>
        </div>
      </header>
      <AdminUsersClient actorRole={actor.role} initialUsers={initialUsers} initialStats={initialStats} />
    </section>
  );
}

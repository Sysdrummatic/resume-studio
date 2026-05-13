import AdminUsersClient from "./admin-users-client";
import Link from "next/link";
import { requireStaffActor } from "../lib/auth-server";
import { fetchAllProfilesAsService, fetchAuthUsersAsService, fetchPlatformStatsAsService } from "../lib/supabase-http";
import type { AppRole, ProfileRecord } from "../lib/auth-types";
import { hasCapability } from "../lib/rbac";

type UserOverview = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string | null;
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const actor = await requireStaffActor();
  const canReadAnalytics = hasCapability(actor.role, "admin.analytics.read");
  const canReadAudit = hasCapability(actor.role, "admin.audit.read");
  const [profilesResult, authUsersResult, platformStatsResult] = await Promise.all([
    fetchAllProfilesAsService(),
    fetchAuthUsersAsService(),
    fetchPlatformStatsAsService(),
  ]);

  const emailById = new Map<string, string>();
  (authUsersResult.data?.users || []).forEach((user: { id: string; email?: string | null }) => {
    emailById.set(user.id, user.email || "");
  });

  let initialUsers: UserOverview[] = (profilesResult.data || []).map((profile: ProfileRecord) => ({
    id: profile.id,
    email: emailById.get(profile.id) || "",
    displayName: profile.display_name || "",
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at || null,
  }));

  if (!hasCapability(actor.role, "admin.users.role_write")) {
    initialUsers = initialUsers.filter((user) => user.id === actor.userId || user.role === "user" || user.role === "recruiter");
  }

  const platformStats = platformStatsResult.data || {
    total_users: initialUsers.length,
    active_users: initialUsers.filter((user) => user.isActive).length,
    total_resumes: 0,
    total_public_links: 0,
    total_public_views: 0,
  };

  const initialStats = canReadAnalytics
    ? {
        totalUsers: platformStats.total_users,
        activeUsers: platformStats.active_users,
        inactiveUsers: platformStats.total_users - platformStats.active_users,
        totalResumes: platformStats.total_resumes,
        totalPublicLinks: platformStats.total_public_links,
        totalPublicViews: platformStats.total_public_views,
      }
    : {
        totalUsers: initialUsers.length,
        activeUsers: initialUsers.filter((user) => user.isActive).length,
        inactiveUsers: initialUsers.filter((user) => !user.isActive).length,
        totalResumes: 0,
        totalPublicLinks: 0,
        totalPublicViews: 0,
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
        <div className="actions-row">
          {canReadAudit ? (
            <Link href="/admin/audit" className="button button--ghost button--small">
              View Audit Logs
            </Link>
          ) : null}
        </div>
      </header>
      <AdminUsersClient actorRole={actor.role} initialUsers={initialUsers} initialStats={initialStats} />
    </section>
  );
}

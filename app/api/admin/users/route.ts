import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { callRpc } from "../../../lib/supabase-http";
import { hasCapability, isNonStaffRole } from "../../../lib/rbac";
import { isAppRole } from "../../../lib/auth-types";

type UserOverview = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  isTestUser: boolean;
  isOcvStaff: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function GET(): Promise<Response> {
  const actorResult = await requireRequestActor({ anyCapability: "admin.users.read" });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  const overviewResult = await callRpc<
    Array<{
      id: string;
      email: string | null;
      display_name: string | null;
      role: string;
      is_active: boolean;
      is_test_user: boolean;
      is_ocv_staff: boolean;
      created_at: string | null;
      updated_at: string | null;
    }>
  >({
    functionName: "get_staff_user_overview",
    accessToken: actorResult.accessToken,
  });

  if (!overviewResult.data || overviewResult.error) {
    return NextResponse.json({ error: overviewResult.error || "Unable to load user overview." }, { status: 500 });
  }

  let users: UserOverview[] = overviewResult.data.map((row) => ({
    id: row.id,
    email: row.email || "",
    displayName: row.display_name || "",
    role: row.role as UserOverview["role"],
    isActive: row.is_active,
    isTestUser: row.is_test_user,
    isOcvStaff: row.is_ocv_staff,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }));

  if (!hasCapability(actorResult.actor.role, "admin.users.role_write")) {
    users = users.filter((user) => user.id === actorResult.actor.userId || (isAppRole(user.role) && isNonStaffRole(user.role)));
  }

  const statsResult = await callRpc<
    Array<{
      total_users: number;
      active_users: number;
      total_resumes: number;
      total_public_links: number;
      total_public_views: number;
      excluded_test_users: number;
      excluded_staff_users: number;
    }>
  >({
    functionName: "get_admin_platform_stats",
    accessToken: actorResult.accessToken,
  });

  const platformStats = statsResult.data?.[0] || {
    total_users: users.length,
    active_users: users.filter((u) => u.isActive).length,
    total_resumes: 0,
    total_public_links: 0,
    total_public_views: 0,
    excluded_test_users: 0,
    excluded_staff_users: 0,
  };

  const stats = {
    totalUsers: platformStats.total_users,
    activeUsers: platformStats.active_users,
    inactiveUsers: platformStats.total_users - platformStats.active_users,
    totalResumes: platformStats.total_resumes,
    totalPublicLinks: platformStats.total_public_links,
    totalPublicViews: platformStats.total_public_views,
    excludedTestUsers: platformStats.excluded_test_users,
    excludedStaffUsers: platformStats.excluded_staff_users,
  };

  return NextResponse.json({
    ok: true,
    actor: {
      userId: actorResult.actor.userId,
      role: actorResult.actor.role,
    },
    stats,
    users,
  });
}

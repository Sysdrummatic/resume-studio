import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { callRpc } from "../../../lib/supabase-http";

type UserOverview = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function GET(): Promise<Response> {
  const actorResult = await requireRequestActor(["admin", "manager"]);
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
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }));

  if (actorResult.actor.role === "manager") {
    users = users.filter((user) => user.id === actorResult.actor.userId || user.role === "user" || user.role === "recruiter");
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.isActive).length,
    inactiveUsers: users.filter((user) => !user.isActive).length,
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

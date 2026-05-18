import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { updateTable } from "../../../lib/supabase-http";

export async function PATCH(request: Request) {
  const actorResult = await requireRequestActor();
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  try {
    const body = (await request.json()) as { bio?: string; displayName?: string; avatarUrl?: string | null };
    const { bio, displayName, avatarUrl } = body;

    const updates: Record<string, string | null> = {};
    if (bio !== undefined) updates.bio = bio;
    if (displayName !== undefined) updates.display_name = displayName;
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && (typeof avatarUrl !== "string" || avatarUrl.length > 500_000 || !avatarUrl.startsWith("data:image/"))) {
        return NextResponse.json({ error: "Avatar image payload is invalid." }, { status: 400 });
      }
      updates.avatar_url = avatarUrl;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await updateTable({
      table: "profiles",
      values: updates,
      query: `id=eq.${actorResult.actor.userId}`,
      accessToken: actorResult.accessToken,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data?.[0] });
  } catch (err) {
    console.error("[profile-update-error]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../lib/auth-request";
import { callRpc } from "../../../lib/supabase-http";
import { buildProfileDisplayName, normalizeProfileNameParts } from "../../../lib/profile-name";

type ProfilePatchBody = {
  bio?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
};

function validateProfileName(value: string, fieldName: string): string | null {
  if (value.length > 120) {
    return `${fieldName} must be 120 characters or fewer.`;
  }
  return null;
}

export async function PATCH(request: Request) {
  const actorResult = await requireRequestActor();
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  try {
    const body = (await request.json()) as ProfilePatchBody;
    const { bio, displayName, firstName, lastName, avatarUrl } = body;

    const updates: Record<string, string | null> = {};
    if (bio !== undefined) updates.bio = bio;
    if (firstName !== undefined || lastName !== undefined) {
      const normalized = normalizeProfileNameParts(
        firstName !== undefined ? firstName : actorResult.actor.firstName,
        lastName !== undefined ? lastName : actorResult.actor.lastName,
      );
      const firstNameError = validateProfileName(normalized.firstName, "First name");
      const lastNameError = validateProfileName(normalized.lastName, "Last name");
      if (firstNameError || lastNameError) {
        return NextResponse.json({ error: firstNameError || lastNameError }, { status: 400 });
      }

      const nextDisplayName = buildProfileDisplayName(normalized.firstName, normalized.lastName);
      if (!nextDisplayName) {
        return NextResponse.json({ error: "First name or last name is required." }, { status: 400 });
      }

      updates.firstName = normalized.firstName;
      updates.lastName = normalized.lastName;
      updates.displayName = nextDisplayName;
    } else if (displayName !== undefined) {
      updates.displayName = displayName;
    }
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && (typeof avatarUrl !== "string" || avatarUrl.length > 500_000 || !avatarUrl.startsWith("data:image/"))) {
        return NextResponse.json({ error: "Avatar image payload is invalid." }, { status: 400 });
      }
      updates.avatarUrl = avatarUrl;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await callRpc<Array<Record<string, unknown>>>({
      functionName: "update_own_profile",
      payload: {
        input_updates: updates,
      },
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

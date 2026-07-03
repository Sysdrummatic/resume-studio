import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../lib/auth-request";
import { isUserDataTransferEnabled } from "../../../../lib/platform-feature-flags";
import {
  fetchResumeDocumentsForUser,
  fetchResumePresetsForUser,
  fetchResumePresetVariantsForUser,
  fetchResumeUserLocalesForUser,
} from "../../../../lib/resume-server";
import type { ResumePresetVariantRow } from "../../../../lib/resume-server";
import { buildUserDataBundleYaml } from "../../../../lib/user-data-transfer";

export const dynamic = "force-dynamic";

/**
 * GET /api/resume/transfer/export
 * Downloads the authenticated user's full CV data bundle (master documents,
 * language versions, CV versions) as a single YAML file. Publish state is
 * intentionally excluded — see ADR 0018.
 */
export async function GET(): Promise<Response> {
  const actorResult = await requireRequestActor({
    allCapabilities: ["resume.document.read_own", "resume.language.read_own", "resume.preset.read_own"],
  });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  if (!(await isUserDataTransferEnabled())) {
    return NextResponse.json({ error: "Data export is currently disabled." }, { status: 403 });
  }

  const userId = actorResult.actor.userId;
  const [documents, languages, presets, variants] = await Promise.all([
    fetchResumeDocumentsForUser(userId),
    fetchResumeUserLocalesForUser(userId),
    fetchResumePresetsForUser(userId),
    fetchResumePresetVariantsForUser(userId),
  ]);

  const variantsByPresetId = new Map<string, ResumePresetVariantRow[]>();
  for (const variant of variants) {
    const list = variantsByPresetId.get(variant.preset_id) || [];
    list.push(variant);
    variantsByPresetId.set(variant.preset_id, list);
  }

  const bundleYaml = buildUserDataBundleYaml({
    languages: languages.map((language) => ({
      code: language.code,
      label: language.label,
      short_label: language.short_label,
      is_default: language.is_default,
      sort_order: language.sort_order,
    })),
    documents: documents.map((document) => ({
      locale: document.locale,
      title: document.title,
      ai_generated: document.ai_generated,
      yaml_content: document.yaml_content,
    })),
    cv_versions: presets.map((preset) => ({
      title: preset.title,
      default_locale: preset.default_locale,
      allow_indexing: preset.allow_indexing,
      ai_generated: preset.ai_generated,
      selection: preset.selection,
      variants: (variantsByPresetId.get(preset.id) || []).map((variant) => ({
        locale: variant.locale,
        selection: variant.selection,
      })),
    })),
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(bundleYaml, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": `attachment; filename="opencivera-user-data-${date}.yaml"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

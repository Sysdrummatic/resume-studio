import { NextResponse } from "next/server";
import { requireRequestActor } from "../../../../lib/auth-request";
import { isUserDataTransferEnabled } from "../../../../lib/platform-feature-flags";
import { normalizeLocale } from "../../../../lib/resume-schema";
import {
  deleteResumePreset,
  fetchResumeDocumentsForUser,
  fetchResumePresetsForUser,
  importResumePresetVariant,
  normalizeResumePresetSelection,
  saveResumeDraftDocument,
  saveResumePreset,
  upsertResumeUserLocale,
  validateResumePresetSelection,
} from "../../../../lib/resume-server";
import { parseUserDataBundle } from "../../../../lib/user-data-transfer";
import { callRpc } from "../../../../lib/supabase-http";

export const dynamic = "force-dynamic";

type ImportBody = {
  yamlContent?: string;
};

/**
 * POST /api/resume/transfer/import
 * Restores a user data bundle produced by /api/resume/transfer/export.
 * Semantics (ADR 0018): languages and master documents are overwritten per
 * locale, private CV versions are replaced, published CV versions and public
 * links are left untouched. Everything imported lands as a private draft.
 */
export async function POST(request: Request): Promise<Response> {
  const actorResult = await requireRequestActor({
    allCapabilities: ["resume.document.write_own", "resume.language.write_own", "resume.preset.write_own"],
  });
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.message }, { status: actorResult.status });
  }

  if (!(await isUserDataTransferEnabled())) {
    return NextResponse.json({ error: "Data import is currently disabled." }, { status: 403 });
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = parseUserDataBundle(String(body.yamlContent || ""));
  if (!parsed.bundle) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const bundle = parsed.bundle;

  const accessToken = actorResult.accessToken;
  const userId = actorResult.actor.userId;

  // Validate everything before writing anything: parseUserDataBundle already
  // checked locale consistency; here we check selections and document YAML.
  for (const version of bundle.cv_versions) {
    const selections = [version.selection, ...version.variants.map((variant) => variant.selection)];
    for (const selection of selections) {
      if (validateResumePresetSelection(normalizeResumePresetSelection(selection)).length > 0) {
        return NextResponse.json(
          { error: `CV version "${version.title}" has an invalid selection.` },
          { status: 400 },
        );
      }
    }
  }

  for (const document of bundle.documents) {
    const validation = await callRpc<boolean>({
      functionName: "validate_resume_document_yaml",
      payload: { input_yaml: document.yaml_content },
      accessToken,
    });
    if (validation.error || !validation.data) {
      return NextResponse.json(
        { error: `Document "${document.locale}" failed YAML schema validation.` },
        { status: 400 },
      );
    }
  }

  for (const language of bundle.languages) {
    const upserted = await upsertResumeUserLocale(
      accessToken,
      userId,
      { code: language.code, label: language.label, shortLabel: language.short_label },
      { setDefault: language.is_default },
    );
    if (!upserted) {
      return NextResponse.json(
        { error: `Import failed while saving the "${language.code}" language version.` },
        { status: 400 },
      );
    }
  }

  for (const document of bundle.documents) {
    const saved = await saveResumeDraftDocument(accessToken, userId, document.locale, {
      yamlContent: document.yaml_content,
      title: document.title,
      isPublic: false,
      allowIndexing: false,
      aiGenerated: document.ai_generated,
    });
    if (!saved) {
      return NextResponse.json(
        { error: `Import failed while saving the "${document.locale}" document.` },
        { status: 500 },
      );
    }
  }

  // Replace private CV versions; published ones keep their links and snapshots.
  const existingPresets = await fetchResumePresetsForUser(userId);
  for (const preset of existingPresets) {
    if (!preset.is_public) {
      await deleteResumePreset(accessToken, userId, preset.id);
    }
  }

  const documentsAfterImport = await fetchResumeDocumentsForUser(userId);
  const documentByLocale = new Map(documentsAfterImport.map((document) => [normalizeLocale(document.locale), document]));

  let importedCvVersions = 0;
  const skippedCvVersions: string[] = [];
  for (const version of bundle.cv_versions) {
    const defaultLocale = normalizeLocale(version.default_locale);
    const document = documentByLocale.get(defaultLocale);
    const selection = normalizeResumePresetSelection(version.selection);
    if (!document) {
      skippedCvVersions.push(version.title);
      continue;
    }

    const preset = await saveResumePreset(accessToken, userId, {
      documentId: document.id,
      title: version.title,
      selection,
      isPublic: false,
      allowIndexing: version.allow_indexing,
      aiGenerated: version.ai_generated,
      defaultLocale,
    });
    if (!preset) {
      skippedCvVersions.push(version.title);
      continue;
    }
    importedCvVersions += 1;

    for (const variant of version.variants) {
      const variantLocale = normalizeLocale(variant.locale);
      if (variantLocale === defaultLocale) {
        continue;
      }
      await importResumePresetVariant(
        accessToken,
        userId,
        preset,
        variantLocale,
        normalizeResumePresetSelection(variant.selection),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    imported: {
      languages: bundle.languages.length,
      documents: bundle.documents.length,
      cvVersions: importedCvVersions,
    },
    skippedCvVersions,
  });
}

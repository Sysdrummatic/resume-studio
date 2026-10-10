import { NextResponse } from "next/server";
import yaml from "js-yaml";
import { requireRequestActor } from "../../../../lib/auth-request";
import { isUserDataTransferEnabled } from "../../../../lib/platform-feature-flags";
import { normalizeLocale } from "../../../../lib/resume-schema";
import {
  deleteResumePreset,
  fetchResumeDocumentsForUser,
  fetchPrivateResumePresetIdsForUser,
  importLanguagesAndDocuments,
  importResumePresetVariant,
  normalizeResumePresetSelection,
  saveResumePreset,
  upgradeLegacyResumeYamlContent,
  validateResumePresetSelection,
} from "../../../../lib/resume-server";
import { parseUserDataBundle } from "../../../../lib/user-data-transfer";
import type { UserDataBundleCvVersion } from "../../../../lib/user-data-transfer";
import { callRpc } from "../../../../lib/supabase-http";
import { flagSuspiciousResumeContent } from "../../../../lib/content-safety-audit";
import { applyResumeSelectionToRawDocument } from "../../../../lib/preset-selection";

export const dynamic = "force-dynamic";

type ImportBody = {
  yamlContent?: string;
};

function defaultSelectionForVersion(version: UserDataBundleCvVersion): unknown {
  return version.variants.find((variant) => normalizeLocale(variant.locale) === normalizeLocale(version.default_locale))?.selection
    ?? version.selection;
}

function importWriteFailure(step: string): Response {
  return NextResponse.json({
    ok: false,
    error: `Import stopped while ${step}. Some changes may already have been saved; retry the same file.`,
  }, { status: 500 });
}

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
  const bundle = {
    ...parsed.bundle,
    documents: parsed.bundle.documents.map((document) => ({
      ...document,
      yaml_content: upgradeLegacyResumeYamlContent(document.yaml_content),
    })),
  };

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

  const preflightDocuments = new Map(bundle.documents.map((document) => [normalizeLocale(document.locale), document]));
  const missingVariantDocument = bundle.cv_versions.some((version) =>
    version.variants.some((variant) => !preflightDocuments.has(normalizeLocale(variant.locale))));
  if (missingVariantDocument) {
    const existingDocuments = await fetchResumeDocumentsForUser(userId);
    for (const document of existingDocuments) {
      if (!preflightDocuments.has(normalizeLocale(document.locale))) {
        preflightDocuments.set(normalizeLocale(document.locale), document);
      }
    }
  }
  for (const version of bundle.cv_versions) {
    for (const { locale, selection } of [
      { locale: version.default_locale, selection: defaultSelectionForVersion(version) },
      ...version.variants.filter((variant) => normalizeLocale(variant.locale) !== normalizeLocale(version.default_locale)),
    ]) {
      const document = preflightDocuments.get(normalizeLocale(locale));
      let rawDocument: unknown;
      try {
        rawDocument = document
          ? yaml.load(document.yaml_content, { maxTotalMergeKeys: 50 } as yaml.LoadOptions)
          : null;
      } catch {
        rawDocument = null;
      }
      if (!applyResumeSelectionToRawDocument(rawDocument, normalizeResumePresetSelection(selection))) {
        return NextResponse.json(
          { error: `CV version "${version.title}" has a selection that cannot be applied to "${locale}".` },
          { status: 400 },
        );
      }
    }
  }

  const existingPrivatePresetIds = await fetchPrivateResumePresetIdsForUser(userId);
  if (!existingPrivatePresetIds) {
    return NextResponse.json({ ok: false, error: "Import stopped because existing private CV versions could not be read. No changes were saved." }, { status: 500 });
  }

  const imported = await importLanguagesAndDocuments(accessToken, userId, bundle, ({ locale, documentId, yamlContent }) =>
    flagSuspiciousResumeContent(yamlContent, {
      userId,
      documentId,
      locale,
      source: "resume_import_save",
    }),
  );
  if (!imported.ok) {
    return NextResponse.json(
      { error: imported.error, ...(imported.code ? { code: imported.code } : {}), ...(imported.parityIssues ? { parityIssues: imported.parityIssues } : {}) },
      { status: imported.status },
    );
  }

  // Replace private CV versions; published ones keep their links and snapshots.
  for (const presetId of existingPrivatePresetIds) {
    if (!await deleteResumePreset(accessToken, userId, presetId)) {
      return importWriteFailure("replacing private CV versions");
    }
  }

  const documentsAfterImport = await fetchResumeDocumentsForUser(userId);
  const documentByLocale = new Map(documentsAfterImport.map((document) => [normalizeLocale(document.locale), document]));

  let importedCvVersions = 0;
  for (const version of bundle.cv_versions) {
    const defaultLocale = normalizeLocale(version.default_locale);
    const document = documentByLocale.get(defaultLocale);
    const selection = normalizeResumePresetSelection(defaultSelectionForVersion(version));
    if (!document) {
      return importWriteFailure(`loading the "${defaultLocale}" document`);
    }

    const preset = await saveResumePreset(accessToken, userId, {
      documentId: document.id,
      title: version.title,
      selection,
      allowIndexing: version.allow_indexing,
      aiGenerated: version.ai_generated,
      styleSettings: version.style_settings,
      defaultLocale,
    });
    if (!preset) {
      return importWriteFailure(`saving CV version "${version.title}"`);
    }
    importedCvVersions += 1;

    for (const variant of version.variants) {
      const variantLocale = normalizeLocale(variant.locale);
      if (variantLocale === defaultLocale) {
        continue;
      }
      const variantSaved = await importResumePresetVariant(
        accessToken,
        userId,
        preset,
        variantLocale,
        normalizeResumePresetSelection(variant.selection),
      );
      if (!variantSaved) {
        return importWriteFailure(`saving the "${variantLocale}" version of "${version.title}"`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    imported: {
      languages: bundle.languages.length,
      documents: bundle.documents.length,
      cvVersions: importedCvVersions,
    },
  });
}

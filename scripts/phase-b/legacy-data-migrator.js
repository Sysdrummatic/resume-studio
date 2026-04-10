"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  createEmptyResumeDocument,
  normalizeLocale,
  coerceLegacyResumeData,
  serializeResumeDocument,
  validateResumeYamlContent,
} = require("./resume-yaml-contract");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickProfileDisplayName(profile, userId) {
  const profileObj = asObject(profile);
  const email = normalizeText(profileObj.email);
  const displayName = normalizeText(profileObj.display_name || profileObj.displayName);
  if (displayName) return displayName;
  if (email.includes("@")) return email.split("@")[0];
  if (userId) return `user-${String(userId).slice(0, 8)}`;
  return "New User";
}

function compareDates(a, b) {
  const first = Date.parse(String(a ?? ""));
  const second = Date.parse(String(b ?? ""));
  if (Number.isNaN(first) && Number.isNaN(second)) return 0;
  if (Number.isNaN(first)) return -1;
  if (Number.isNaN(second)) return 1;
  return first - second;
}

function buildDefaultSlug(seed, takenSlugs) {
  const compact = String(seed ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  let candidate = `r-${compact || "profile"}`;
  let suffix = 1;
  while (takenSlugs.has(candidate)) {
    candidate = `r-${compact || "profile"}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function buildMigrationPlan(snapshot) {
  const source = asObject(snapshot);
  const profiles = asArray(source.profiles);
  const resumes = asArray(source.resumes);
  const publicLinks = asArray(source.public_links);
  const warnings = [];

  const profilesById = new Map(
    profiles
      .filter((profile) => normalizeText(profile?.id))
      .map((profile) => [normalizeText(profile.id), asObject(profile)]),
  );

  const resumesById = new Map(
    resumes
      .filter((row) => normalizeText(row?.id))
      .map((row) => [normalizeText(row.id), asObject(row)]),
  );

  const documentsByUserLocale = new Map();
  const sourceLinks = [];
  let duplicateLocaleConflicts = 0;

  for (const resumeRowRaw of resumes) {
    const resumeRow = asObject(resumeRowRaw);
    const userId = normalizeText(resumeRow.user_id);
    if (!userId) {
      warnings.push("Skipped resume row without user_id.");
      continue;
    }

    const locale = normalizeLocale(resumeRow.locale);
    const profile = profilesById.get(userId);
    const fallbackName = pickProfileDisplayName(profile, userId);
    const normalizedDocument = coerceLegacyResumeData(resumeRow.data, { fallbackName });
    const yamlContent = serializeResumeDocument(normalizedDocument, { fallbackName });

    const validation = validateResumeYamlContent(yamlContent);
    if (!validation.valid) {
      warnings.push(
        `Validation warning for resume ${normalizeText(resumeRow.id) || "(unknown-id)"}: ${validation.errors.join("; ")}`,
      );
    }

    const docKey = `${userId}:${locale}`;
    const candidateDocument = {
      user_id: userId,
      locale,
      title: normalizeText(resumeRow.title) || "Master resume",
      yaml_content: yamlContent,
      schema_version: 1,
      is_public: toBoolean(resumeRow.is_public, true),
      allow_indexing: toBoolean(resumeRow.allow_indexing, false),
      created_by: userId,
      legacy_resume_id: normalizeText(resumeRow.id) || null,
      source: "legacy",
      updated_at: normalizeText(resumeRow.updated_at),
    };

    const existing = documentsByUserLocale.get(docKey);
    if (existing) {
      duplicateLocaleConflicts += 1;
      const comparison = compareDates(existing.updated_at, candidateDocument.updated_at);
      if (comparison <= 0) {
        documentsByUserLocale.set(docKey, candidateDocument);
        warnings.push(`Duplicate locale document for ${docKey}; kept the most recently updated row.`);
      } else {
        warnings.push(`Duplicate locale document for ${docKey}; kept the first newer row.`);
      }
    } else {
      documentsByUserLocale.set(docKey, candidateDocument);
    }

    const legacySlug = normalizeText(resumeRow.slug);
    if (!publicLinks.length && legacySlug) {
      sourceLinks.push({
        slug: legacySlug,
        resume_id: normalizeText(resumeRow.id) || null,
        is_active: true,
        allow_indexing: toBoolean(resumeRow.allow_indexing, false),
        view_count: 0,
      });
    }
  }

  if (publicLinks.length > 0) {
    sourceLinks.push(...publicLinks);
  }

  const usersInScope = new Set([
    ...profilesById.keys(),
    ...Array.from(documentsByUserLocale.values()).map((doc) => doc.user_id),
  ]);

  let generatedDefaultDocuments = 0;
  for (const userId of usersInScope) {
    for (const locale of ["en", "pl"]) {
      const key = `${userId}:${locale}`;
      if (documentsByUserLocale.has(key)) {
        continue;
      }

      const profile = profilesById.get(userId);
      const fallbackName = pickProfileDisplayName(profile, userId);
      const defaults = createEmptyResumeDocument(fallbackName);
      const yamlContent = serializeResumeDocument(defaults, { fallbackName });

      documentsByUserLocale.set(key, {
        user_id: userId,
        locale,
        title: "Master resume",
        yaml_content: yamlContent,
        schema_version: 1,
        is_public: true,
        allow_indexing: false,
        created_by: userId,
        legacy_resume_id: null,
        source: "generated-default",
        updated_at: "",
      });
      generatedDefaultDocuments += 1;
    }
  }

  const documents = Array.from(documentsByUserLocale.values()).sort((first, second) => {
    const byUser = first.user_id.localeCompare(second.user_id);
    if (byUser !== 0) return byUser;
    return first.locale.localeCompare(second.locale);
  });

  const revisions = documents.map((document) => ({
    user_id: document.user_id,
    locale: document.locale,
    revision_number: 1,
    title: document.title,
    yaml_content: document.yaml_content,
    schema_version: document.schema_version,
    is_public: document.is_public,
    allow_indexing: document.allow_indexing,
    created_by: document.created_by,
    change_note:
      document.source === "legacy"
        ? "Initial migration from legacy resumes.data JSON"
        : "Initial migration generated default template",
  }));

  const linksBySlug = new Map();
  const takenSlugs = new Set();
  for (const linkRaw of sourceLinks) {
    const link = asObject(linkRaw);
    const slug = normalizeText(link.slug);
    if (!slug) {
      warnings.push("Skipped link row without slug.");
      continue;
    }

    const resumeId = normalizeText(link.resume_id);
    const sourceResume = resumeId ? resumesById.get(resumeId) : null;
    const userId = normalizeText(sourceResume?.user_id || link.user_id);
    if (!userId) {
      warnings.push(`Skipped link "${slug}" because target user cannot be resolved.`);
      continue;
    }

    const locale = normalizeLocale(sourceResume?.locale || link.locale || "en");
    const docKeyPrimary = `${userId}:${locale}`;
    const docKeyFallback = `${userId}:en`;
    const docKey = documentsByUserLocale.has(docKeyPrimary) ? docKeyPrimary : docKeyFallback;
    if (!documentsByUserLocale.has(docKey)) {
      warnings.push(`Skipped link "${slug}" because target document ${docKeyPrimary} does not exist.`);
      continue;
    }

    if (linksBySlug.has(slug)) {
      warnings.push(`Duplicate public link slug "${slug}" found; kept the first record.`);
      continue;
    }

    linksBySlug.set(slug, {
      user_id: userId,
      locale: docKey.split(":")[1],
      slug,
      is_active: toBoolean(link.is_active, true),
      allow_indexing: toBoolean(link.allow_indexing, false),
      view_count: Math.max(0, toInteger(link.view_count, 0)),
    });
    takenSlugs.add(slug);
  }

  for (const userId of usersInScope) {
    const hasPrimaryLink = Array.from(linksBySlug.values()).some(
      (link) => link.user_id === userId && link.locale === "en",
    );
    if (hasPrimaryLink) {
      continue;
    }

    const defaultSlug = buildDefaultSlug(userId, takenSlugs);
    linksBySlug.set(defaultSlug, {
      user_id: userId,
      locale: "en",
      slug: defaultSlug,
      is_active: true,
      allow_indexing: false,
      view_count: 0,
    });
    takenSlugs.add(defaultSlug);
  }

  const links = Array.from(linksBySlug.values()).sort((first, second) => first.slug.localeCompare(second.slug));

  return {
    documents,
    revisions,
    links,
    warnings,
    metrics: {
      source_profiles: profiles.length,
      source_resumes: resumes.length,
      source_links: sourceLinks.length,
      migrated_documents: documents.length,
      generated_default_documents: generatedDefaultDocuments,
      migrated_revisions: revisions.length,
      migrated_links: links.length,
      duplicate_locale_conflicts: duplicateLocaleConflicts,
      users_in_scope: usersInScope.size,
    },
  };
}

function escapeSqlText(value) {
  return String(value ?? "").replaceAll("'", "''");
}

function sqlNullableText(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  return `'${escapeSqlText(value)}'`;
}

function sqlBoolean(value) {
  return value ? "true" : "false";
}

function sqlInteger(value) {
  return String(Number.parseInt(String(value), 10) || 0);
}

function sqlDollarQuoted(value, prefix, indexHint) {
  let counter = Number.isFinite(indexHint) ? indexHint : 0;
  let tag = `$${prefix}${counter}$`;
  while (String(value).includes(tag)) {
    counter += 1;
    tag = `$${prefix}${counter}$`;
  }
  return `${tag}${value}${tag}`;
}

function generateSqlBackfill(plan) {
  const lines = [];
  lines.push("-- Generated by scripts/phase-b/legacy-data-migrator.js");
  lines.push("begin;");
  lines.push("");

  plan.documents.forEach((document, index) => {
    const yamlSql = sqlDollarQuoted(document.yaml_content, "yaml", index);
    lines.push(
      [
        "insert into public.resume_documents (",
        "  user_id, locale, title, yaml_content, schema_version, is_public, allow_indexing, created_by, legacy_resume_id",
        ") values (",
        `  ${sqlNullableText(document.user_id)},`,
        `  ${sqlNullableText(document.locale)},`,
        `  ${sqlNullableText(document.title)},`,
        `  ${yamlSql},`,
        `  ${sqlInteger(document.schema_version)},`,
        `  ${sqlBoolean(document.is_public)},`,
        `  ${sqlBoolean(document.allow_indexing)},`,
        `  ${sqlNullableText(document.created_by)},`,
        `  ${sqlNullableText(document.legacy_resume_id)}`,
        ")",
        "on conflict (user_id, locale) do update set",
        "  title = excluded.title,",
        "  yaml_content = excluded.yaml_content,",
        "  schema_version = excluded.schema_version,",
        "  is_public = excluded.is_public,",
        "  allow_indexing = excluded.allow_indexing,",
        "  updated_at = now();",
      ].join("\n"),
    );
    lines.push("");
  });

  plan.revisions.forEach((revision, index) => {
    const yamlSql = sqlDollarQuoted(revision.yaml_content, "rev", index);
    lines.push(
      [
        "insert into public.resume_revisions (",
        "  document_id, revision_number, locale, title, yaml_content, schema_version, is_public, allow_indexing, created_by, change_note",
        ")",
        "select",
        "  d.id,",
        `  ${sqlInteger(revision.revision_number)},`,
        `  ${sqlNullableText(revision.locale)},`,
        `  ${sqlNullableText(revision.title)},`,
        `  ${yamlSql},`,
        `  ${sqlInteger(revision.schema_version)},`,
        `  ${sqlBoolean(revision.is_public)},`,
        `  ${sqlBoolean(revision.allow_indexing)},`,
        `  ${sqlNullableText(revision.created_by)},`,
        `  ${sqlNullableText(revision.change_note)}`,
        "from public.resume_documents d",
        `where d.user_id = ${sqlNullableText(revision.user_id)}`,
        `  and d.locale = ${sqlNullableText(revision.locale)}`,
        "on conflict (document_id, revision_number) do nothing;",
      ].join("\n"),
    );
    lines.push("");
  });

  plan.links.forEach((link) => {
    lines.push(
      [
        "insert into public.resume_public_links (",
        "  document_id, slug, is_active, allow_indexing, view_count",
        ")",
        "select",
        "  d.id,",
        `  ${sqlNullableText(link.slug)},`,
        `  ${sqlBoolean(link.is_active)},`,
        `  ${sqlBoolean(link.allow_indexing)},`,
        `  ${sqlInteger(link.view_count)}`,
        "from public.resume_documents d",
        `where d.user_id = ${sqlNullableText(link.user_id)}`,
        `  and d.locale = ${sqlNullableText(link.locale)}`,
        "on conflict (slug) do update set",
        "  is_active = excluded.is_active,",
        "  allow_indexing = excluded.allow_indexing,",
        "  view_count = excluded.view_count,",
        "  updated_at = now();",
      ].join("\n"),
    );
    lines.push("");
  });

  lines.push("commit;");
  return `${lines.join("\n")}\n`;
}

function buildDryRunReport(plan) {
  return {
    generated_at: new Date().toISOString(),
    metrics: plan.metrics,
    warnings: plan.warnings,
    preview: {
      documents: plan.documents.slice(0, 3).map((entry) => ({
        user_id: entry.user_id,
        locale: entry.locale,
        title: entry.title,
        source: entry.source,
      })),
      links: plan.links.slice(0, 5),
    },
  };
}

function parseCliArgs(rawArgs) {
  const args = {
    input: "",
    report: path.join("reports", "phase-b-migration-dry-run.json"),
    sql: "",
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (token === "--input") {
      args.input = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--report") {
      args.report = rawArgs[index + 1] || args.report;
      index += 1;
      continue;
    }
    if (token === "--sql") {
      args.sql = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
  }

  return args;
}

function writeFileWithDirectory(targetPath, content) {
  const directory = path.dirname(targetPath);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

function runCli(rawArgs = process.argv.slice(2)) {
  const args = parseCliArgs(rawArgs);
  if (!args.input) {
    console.error(
      "Missing required --input argument. Example:\nnode scripts/phase-b/legacy-data-migrator.js --input ./supabase/legacy-export.json --sql ./supabase/migrations/20260410_phase_b_generated_backfill.sql",
    );
    process.exitCode = 1;
    return;
  }

  const snapshotPath = path.resolve(process.cwd(), args.input);
  const snapshotRaw = fs.readFileSync(snapshotPath, "utf8").replace(/^\uFEFF/, "");
  const snapshot = JSON.parse(snapshotRaw);

  const plan = buildMigrationPlan(snapshot);
  const report = buildDryRunReport(plan);
  const reportPath = path.resolve(process.cwd(), args.report);
  writeFileWithDirectory(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (args.sql) {
    const sqlPath = path.resolve(process.cwd(), args.sql);
    writeFileWithDirectory(sqlPath, generateSqlBackfill(plan));
  }

  const summary = [
    `Users in scope: ${plan.metrics.users_in_scope}`,
    `Documents: ${plan.metrics.migrated_documents} (generated defaults: ${plan.metrics.generated_default_documents})`,
    `Revisions: ${plan.metrics.migrated_revisions}`,
    `Public links: ${plan.metrics.migrated_links}`,
    `Warnings: ${plan.warnings.length}`,
    `Dry-run report: ${reportPath}`,
    args.sql ? `Generated SQL: ${path.resolve(process.cwd(), args.sql)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  console.log(summary);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  buildMigrationPlan,
  buildDryRunReport,
  generateSqlBackfill,
  parseCliArgs,
  runCli,
};

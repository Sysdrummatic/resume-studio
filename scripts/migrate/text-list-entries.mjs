#!/usr/bin/env node
// ocv-0211: rewrites stored resume YAML to the entry-object shape for tech_stack
// and interests, removes __ocv, and replaces legacy-* entry IDs with UUIDs while
// keeping every account's language versions paired (app/lib/resume-entry-id-migration.ts).
//
//   node --env-file=.env.local scripts/migrate/text-list-entries.mjs                 # dry run (default)
//   node --env-file=.env.local scripts/migrate/text-list-entries.mjs --apply \
//        --confirm-host=<project-ref>.supabase.co --backup-confirmed [--snapshots]
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Writes a JSON
// report (--report=path, default ./ocv-0211-report.json). Never deletes content.
import fs from "node:fs";
import { register } from "node:module";

register("../../tests/helpers/ts-extension-resolve.mjs", import.meta.url);

const { planAccountMigration, rewriteSnapshotYaml, rewriteStoredYaml } = await import("../../app/lib/resume-entry-id-migration.ts");
const { buildPublishedExportContent } = await import("../../app/lib/published-export.ts");

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const apply = args.has("apply");
const includeSnapshots = args.has("snapshots");
const reportPath = args.get("report") || "./ocv-0211-report.json";

const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!baseUrl || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const host = new URL(baseUrl).host;

if (apply) {
  if (args.get("confirm-host") !== host) throw new Error(`--apply needs --confirm-host=${host} (the project this run would write to).`);
  if (!args.has("backup-confirmed")) throw new Error("--apply needs --backup-confirmed: back up resume_documents, resume_revisions, resume_published_cv_locales and resume_onboarding_test_runs first.");
}

async function rest(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path.split("?")[0]} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function fetchAll(table, select, extra = "", order = "id") {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(`${table}?select=${select}&order=${order}&limit=1000&offset=${offset}${extra}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const report = { host, mode: apply ? "apply" : "dry-run", accounts: { total: 0, migrated: 0, unchanged: 0, skipped: [] }, guessed: [], written: { documents: 0, revisions: 0, onboardingRuns: 0, snapshots: 0 }, failures: [] };
const idMapsByUser = new Map();

const documents = await fetchAll("resume_documents", "id,user_id,locale,yaml_content,updated_at");
const userLocales = await fetchAll("resume_user_locales", "user_id,locale,is_default", "", "user_id,locale");
const defaultLocaleOf = new Map(userLocales.filter((row) => row.is_default).map((row) => [row.user_id, row.locale]));

const byUser = new Map();
for (const document of documents) byUser.set(document.user_id, [...(byUser.get(document.user_id) || []), document]);

for (const [userId, rows] of byUser) {
  report.accounts.total += 1;
  const defaultLocale = defaultLocaleOf.get(userId) || (rows.some((row) => row.locale === "en") ? "en" : rows[0].locale);
  const plan = planAccountMigration(rows.map((row) => ({ locale: row.locale, yamlContent: row.yaml_content })), defaultLocale);

  if (plan.status === "skipped") {
    report.accounts.skipped.push({ userId, reason: plan.reason, locale: plan.locale });
    continue;
  }
  report.accounts[plan.status] += 1;
  idMapsByUser.set(userId, plan.idMaps);
  for (const guess of plan.guessed) report.guessed.push({ userId, ...guess });
  if (plan.status === "unchanged" || !apply) continue;

  try {
    for (const migrated of plan.documents.filter((document) => document.changed)) {
      const row = rows.find((candidate) => candidate.locale === migrated.locale);
      // Compare-and-swap on updated_at: a save made while the script runs wins.
      const updated = await rest(`resume_documents?id=eq.${row.id}&updated_at=eq.${encodeURIComponent(row.updated_at)}`, {
        method: "PATCH", body: { yaml_content: migrated.yamlContent }, headers: { Prefer: "return=representation" },
      });
      if (updated.length !== 1) throw new Error(`document ${row.id} (${row.locale}) changed while migrating; left as is`);
      report.written.documents += 1;

      const idMap = plan.idMaps[row.locale];
      const revisions = await fetchAll("resume_revisions", "id,yaml_content", `&document_id=eq.${row.id}`);
      for (const revision of revisions) {
        const next = rewriteStoredYaml(revision.yaml_content, idMap);
        if (next === revision.yaml_content) continue;
        await rest(`resume_revisions?id=eq.${revision.id}`, { method: "PATCH", body: { yaml_content: next } });
        report.written.revisions += 1;
      }
    }
  } catch (error) {
    report.failures.push({ userId, error: String(error.message || error) });
  }
}

const onboardingRuns = await fetchAll("resume_onboarding_test_runs", "id,locale,drafts");
for (const run of onboardingRuns) {
  const entries = Object.entries(run.drafts || {}).filter(([, value]) => typeof value === "string");
  if (!entries.length) continue;
  const plan = planAccountMigration(entries.map(([locale, yamlContent]) => ({ locale, yamlContent })), entries.some(([locale]) => locale === run.locale) ? run.locale : entries[0][0]);
  if (plan.status !== "migrated" || !apply) continue;
  try {
    const drafts = { ...run.drafts, ...Object.fromEntries(plan.documents.map((document) => [document.locale, document.yamlContent])) };
    await rest(`resume_onboarding_test_runs?id=eq.${run.id}`, { method: "PATCH", body: { drafts } });
    report.written.onboardingRuns += 1;
  } catch (error) {
    report.failures.push({ onboardingRunId: run.id, error: String(error.message || error) });
  }
}

if (includeSnapshots) {
  const snapshots = await fetchAll("resume_published_cv_locales", "id,user_id,locale,yaml_content,selection");
  for (const snapshot of snapshots) {
    const next = rewriteSnapshotYaml(snapshot.yaml_content);
    if (next === snapshot.yaml_content) continue;
    // The public output of a snapshot must stay byte-identical; otherwise it is left alone.
    const identical = [false, true].every((translation) => {
      const before = buildPublishedExportContent(snapshot.yaml_content, snapshot.selection, { translation });
      const after = buildPublishedExportContent(next, snapshot.selection, { translation });
      return JSON.stringify(before) === JSON.stringify(after);
    });
    if (!identical) {
      report.failures.push({ snapshotId: snapshot.id, error: "public export would change; snapshot left as is" });
      continue;
    }
    if (!apply) continue;
    try {
      await rest("rpc/rewrite_published_snapshot_yaml", { method: "POST", body: { p_id: snapshot.id, p_yaml: next } });
      report.written.snapshots += 1;
    } catch (error) {
      report.failures.push({ snapshotId: snapshot.id, error: String(error.message || error) });
    }
  }
}

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.mode} on ${host}: ${report.accounts.total} accounts (${report.accounts.migrated} to migrate, ${report.accounts.unchanged} unchanged, ${report.accounts.skipped.length} skipped), ${report.guessed.length} guessed pairings, ${report.failures.length} failures.`);
console.log(`written: ${JSON.stringify(report.written)}. Report: ${reportPath}`);
if (report.failures.length) process.exitCode = 1;

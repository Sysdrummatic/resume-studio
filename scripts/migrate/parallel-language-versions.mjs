#!/usr/bin/env node
// ocv-0211 / ADR 0024: makes the stored language versions of every account
// parallel lists without entry IDs. For each account it
//   1. upgrades legacy documents the way a save does (name split, summary list, ...),
//   2. drops entry_id and __ocv,
//   3. pads the shorter versions with empty slots / bullets up to the longest one
//      (nothing is ever removed),
//   4. reports every difference it cannot repair (a different order or neutral fields).
// Revisions and published snapshots are not touched; the readers still accept IDs.
//
//   node --env-file=.env.local scripts/migrate/parallel-language-versions.mjs                  # dry run (default)
//   node --env-file=.env.local scripts/migrate/parallel-language-versions.mjs --apply \
//        --confirm-host=<project-ref>.supabase.co --backup-confirmed
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Writes a JSON
// report (--report=path, default ./ocv-0211-report.json). Writes use compare-and-swap
// on updated_at, so a save made while the script runs wins.
import fs from "node:fs";
import { register } from "node:module";

import yaml from "js-yaml";

register("../../tests/helpers/ts-extension-resolve.mjs", import.meta.url);

const { PARALLEL_COLLECTIONS, hasEntryIds, inspectParity, padVersionsToLongest, stripEntryIds } = await import("../../app/lib/resume-language-parity.ts");
const { fillMissingRequiredKeysInRawYaml } = await import("../../app/lib/resume-schema.ts");
const { upgradeLegacyResumeYamlContent } = await import("../../app/lib/resume-server.ts");

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const apply = args.has("apply");
const reportPath = args.get("report") || "./ocv-0211-report.json";

const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!baseUrl || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const host = new URL(baseUrl).host;

if (apply) {
  if (args.get("confirm-host") !== host) throw new Error(`--apply needs --confirm-host=${host} (the project this run would write to).`);
  if (!args.has("backup-confirmed")) throw new Error("--apply needs --backup-confirmed: back up resume_documents first.");
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

async function fetchAll(table, select, order) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(`${table}?select=${select}&order=${order}&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

// The same conversion the editor applies when it opens an old document (normalizeSummaryItems).
function withSummaryList(document) {
  if (!document || typeof document.summary !== "string") return document;
  const description = document.summary.trim();
  return { ...document, summary: description ? [{ position: "Default", description, default: true }] : [] };
}

const dump = (document) => yaml.dump(fillMissingRequiredKeysInRawYaml(document), { lineWidth: 120, noRefs: true, sortKeys: false, quotingType: '"' });
const isList = (value) => value == null || Array.isArray(value);

const report = { host, mode: apply ? "apply" : "dry-run", accounts: { total: 0, changed: 0, unchanged: 0, skipped: [] }, padded: [], idsRemovedFrom: 0, remainingDifferences: [], written: 0, failures: [] };

const documents = await fetchAll("resume_documents", "id,user_id,locale,yaml_content,updated_at", "id");
const userLocales = await fetchAll("resume_user_locales", "user_id,locale,is_default", "user_id,locale");
const defaultLocaleOf = new Map(userLocales.filter((row) => row.is_default).map((row) => [row.user_id, row.locale]));

const byUser = new Map();
for (const document of documents) byUser.set(document.user_id, [...(byUser.get(document.user_id) || []), document]);

for (const [userId, rows] of byUser) {
  report.accounts.total += 1;
  const defaultLocale = defaultLocaleOf.get(userId) || (rows.some((row) => row.locale === "en") ? "en" : rows[0].locale);

  let parsed;
  try {
    parsed = Object.fromEntries(rows.map((row) => [row.locale, withSummaryList(yaml.load(upgradeLegacyResumeYamlContent(row.yaml_content)))]));
  } catch (error) {
    report.accounts.skipped.push({ userId, reason: "unparseable", detail: String(error.message || error).slice(0, 120) });
    continue;
  }
  const unsupported = Object.entries(parsed).find(([, document]) => !document || typeof document !== "object" || PARALLEL_COLLECTIONS.some((collection) => !isList(document[collection])));
  if (unsupported) {
    report.accounts.skipped.push({ userId, reason: "unsupported-shape", locale: unsupported[0] });
    continue;
  }

  const hadIds = Object.values(parsed).some(hasEntryIds);
  const padded = padVersionsToLongest(Object.fromEntries(Object.entries(parsed).map(([locale, document]) => [locale, stripEntryIds(document)])));
  const additions = [];
  for (const [locale, document] of Object.entries(padded)) {
    for (const collection of PARALLEL_COLLECTIONS) {
      const added = (document[collection]?.length ?? 0) - (parsed[locale][collection]?.length ?? 0);
      if (added > 0) additions.push({ locale, collection, added });
    }
  }
  const remaining = inspectParity(padded, defaultLocale);

  const changes = rows
    .map((row) => ({ row, yamlContent: dump(padded[row.locale]) }))
    .filter(({ row, yamlContent }) => yamlContent !== row.yaml_content);
  if (changes.length === 0) {
    report.accounts.unchanged += 1;
    continue;
  }
  report.accounts.changed += 1;
  if (hadIds) report.idsRemovedFrom += 1;
  if (additions.length) report.padded.push({ userId, additions });
  if (remaining.length) report.remainingDifferences.push({ userId, defaultLocale, issues: remaining });
  if (!apply) continue;

  for (const { row, yamlContent } of changes) {
    try {
      const updated = await rest(`resume_documents?id=eq.${row.id}&updated_at=eq.${encodeURIComponent(row.updated_at)}`, {
        method: "PATCH", body: { yaml_content: yamlContent }, headers: { Prefer: "return=representation" },
      });
      if (updated.length !== 1) throw new Error("the document changed while migrating; left as is");
      report.written += 1;
    } catch (error) {
      report.failures.push({ userId, locale: row.locale, error: String(error.message || error) });
    }
  }
}

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.mode} on ${host}: ${report.accounts.total} accounts (${report.accounts.changed} to change, ${report.accounts.unchanged} already clean, ${report.accounts.skipped.length} skipped), ${report.padded.length} padded, ${report.remainingDifferences.length} with differences left, ${report.failures.length} failures.`);
console.log(`written: ${report.written}. Report: ${reportPath}`);
if (report.failures.length) process.exitCode = 1;

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
);

const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'));

test('every migration filename has a 14-digit timestamp version', () => {
  for (const file of files) {
    assert.match(
      file,
      /^\d{14}_[a-z0-9_]+\.sql$/,
      `Migration "${file}" must be named <YYYYMMDDHHMMSS>_<snake_case_name>.sql`,
    );
  }
});

test('migration numeric versions are unique', () => {
  const seen = new Map();
  for (const file of files) {
    const version = file.match(/^\d+/)[0];
    assert.ok(
      !seen.has(version),
      `Duplicate migration version "${version}": "${seen.get(version)}" and "${file}". ` +
        'Supabase keys its ledger by version, so duplicates corrupt push/repair tracking.',
    );
    seen.set(version, file);
  }
});

test('migrations directory is not empty', () => {
  assert.ok(files.length > 0, 'expected at least one migration');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const yaml = require('js-yaml');

/**
 * Ten test weryfikuje spójność danych dla przykładowych CV (Sample CV).
 * Sprawdza czy manifest locales.yaml jest poprawny oraz czy wszystkie
 * zdefiniowane w nim pliki resume istnieją i mają podstawowe pola.
 */

test('Sample CV Data Integrity', async (t) => {
  const publicPath = path.join(__dirname, '..', 'public');
  const localesPath = path.join(publicPath, 'data', 'public', 'locales.yaml');

  // 1. Sprawdzenie istnienia manifestu
  await t.test('locales.yaml should exist and be readable', () => {
    assert.ok(fs.existsSync(localesPath), 'Manifest locales.yaml not found at ' + localesPath);
  });

  // Wczytanie manifestu (używamy prostego regexa lub sprawdzamy treść, 
  // jeśli nie chcemy polegać na zewnętrznym js-yaml w środowisku testowym Node)
  const localesContent = fs.readFileSync(localesPath, 'utf8');

  // 2. Weryfikacja plików resume zdefiniowanych w manifestach
  // Szukamy wzorca resume_path: "..."
  const resumePaths = [...localesContent.matchAll(/resume_path:\s*["']?([^"'\s]+)["']?/g)].map(m => m[1]);

  assert.ok(resumePaths.length > 0, 'No resume paths found in locales.yaml');

  for (const relPath of resumePaths) {
    await t.test(`Resume file "${relPath}" should exist and contain basic info`, () => {
      const fullPath = path.join(publicPath, relPath);
      assert.ok(fs.existsSync(fullPath), `Resume file missing at: ${fullPath}`);
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Podstawowe sprawdzenie czy to YAML i czy ma kluczowe dane
      assert.ok(content.includes('first_name:'), `Resume ${relPath} missing "first_name" field`);
      assert.ok(content.includes('family_name:'), `Resume ${relPath} missing "family_name" field`);
      assert.ok(content.includes('brand_initials:'), `Resume ${relPath} missing "brand_initials" field`);
    });
  }
});

test('QR codes stay consistent across every language version of the same sample person', () => {
  // ocv-0203: every locale file used a generic opencivera.com QR value —
  // Steeve Tatums's own portfolio contact even pointed at steevetatums.dev
  // two lines above a QR that pointed somewhere else entirely. Parses the
  // real YAML (not a regex over the raw text) and groups files by person, so
  // a language added later is checked automatically.
  const publicPath = path.join(__dirname, '..', 'public');
  const sampleDir = path.join(publicPath, 'data', 'public');
  const files = fs.globSync(path.join(sampleDir, '**', '*.yaml')).filter((file) => !file.endsWith('locales.yaml'));
  assert.ok(files.length > 0, 'expected to find sample resume YAML files');

  const byPerson = new Map();
  for (const file of files) {
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    if (!doc || typeof doc !== 'object' || !doc.first_name) continue;
    const person = `${doc.first_name} ${doc.family_name}`;
    const qrValues = (doc.qr_codes || []).map((item) => item.value);
    if (!byPerson.has(person)) byPerson.set(person, []);
    byPerson.get(person).push({ file: path.relative(publicPath, file), qrValues });
  }

  assert.ok(byPerson.size > 0, 'expected at least one sample person with QR data');
  for (const [person, entries] of byPerson) {
    const [first, ...rest] = entries;
    for (const entry of rest) {
      assert.deepEqual(entry.qrValues, first.qrValues, `${person}: ${entry.file} QR values must match ${first.file}`);
    }
  }

  // Person-specific, not a shared generic placeholder every sample reused.
  assert.deepEqual(byPerson.get('Ariana Holt')?.[0].qrValues, ['https://arianaholt.dev']);
  assert.deepEqual(byPerson.get('Steeve Tatums')?.[0].qrValues, ['https://steevetatums.dev']);
});

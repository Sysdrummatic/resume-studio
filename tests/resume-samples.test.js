const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

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
      assert.ok(content.includes('name:'), `Resume ${relPath} missing "name" field`);
      assert.ok(content.includes('brand_initials:'), `Resume ${relPath} missing "brand_initials" field`);
    });
  }
});

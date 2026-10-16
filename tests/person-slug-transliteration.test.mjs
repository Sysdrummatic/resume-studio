import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/20261017000000_transliterate_person_slugs.sql", "utf8");
const pairs = [...sql.matchAll(/'([^']*[ąćęłńóśźż][^']*)',\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);

test("both slug functions transliterate before stripping non-ASCII", () => {
  assert.equal(pairs.length, 2);
  for (const [from, to] of pairs) {
    assert.equal([...from].length, [...to].length, "translate() deletes characters when 'to' is shorter");
    for (const letter of "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ") assert.ok(from.includes(letter), `missing ${letter}`);
    assert.match(to, /^[A-Za-z]+$/);
  }
  assert.match(sql, /lower\(translate\(/g);
  assert.ok(sql.indexOf("translate(") < sql.indexOf("[^a-z0-9]+"));
});

test("transliteration is JS-equivalent for Polish names", () => {
  const [from, to] = pairs[0];
  const map = new Map([...from].map((char, i) => [char, [...to][i]]));
  const slug = (input) =>
    [...input].map((c) => map.get(c) ?? c).join("").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user";
  assert.equal(slug("Łukasz Michta"), "lukasz-michta");
  assert.equal(slug("Żółć"), "zolc");
  assert.equal(slug("日本"), "user");
});

test("migration leaves the reserved-slug trigger and existing slugs alone", () => {
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(!code.includes("assign_profile_person_slug"));
  assert.ok(!/update\s+public\.profiles/i.test(code));
});

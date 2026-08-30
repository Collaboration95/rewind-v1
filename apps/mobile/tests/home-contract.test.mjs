import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return readFileSync(join(appRoot, ...parts), 'utf8');
}

test('home composes policy-safe local group data without raw media', () => {
  const route = read('app', '(tabs)', 'index.tsx');
  const home = read('features', 'group', 'LocalGroupHome.tsx');
  const store = read('features', 'group', 'local-home.ts');
  const sqliteStore = read('features', 'group', 'sqlite-home-store.ts');

  assert.doesNotMatch(route, /localUri|from ['"]expo-sqlite['"]/);
  assert.doesNotMatch(home, /localUri|<Image|<Video|share/i);
  assert.match(store, /getContributionBudget/);
  assert.match(store, /listPreRevealContributionSummaries/);
  assert.match(store, /SafeContributionSummary/);
  assert.match(sqliteStore, /openLocalDatabase/);
});

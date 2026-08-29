import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Expo Router scaffold stays inside the mobile workspace', () => {
  const packageManifest = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8'));
  const expoConfig = JSON.parse(readFileSync(join(appRoot, 'app.json'), 'utf8'));

  assert.equal(packageManifest.main, 'expo-router/entry');
  assert.ok(expoConfig.expo.plugins.includes('expo-router'));
  assert.ok(existsSync(join(appRoot, 'app', '_layout.tsx')));
  assert.ok(existsSync(join(appRoot, 'app', 'index.tsx')));
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tabsRoot = join(appRoot, 'app', '(tabs)');

test('four-tab route shell has an accessible stable navigation contract', () => {
  const tabsLayout = readFileSync(join(tabsRoot, '_layout.tsx'), 'utf8');
  const routes = ['index', 'camera', 'chat', 'archive'];

  for (const route of routes) {
    assert.ok(existsSync(join(tabsRoot, `${route}.tsx`)), `${route} route exists`);
  }

  assert.match(tabsLayout, /<Tabs/);
  assert.match(tabsLayout, /tabBarAccessibilityLabel: 'Home tab'/);
  assert.match(tabsLayout, /tabBarAccessibilityLabel: 'Camera tab'/);
  assert.match(tabsLayout, /tabBarAccessibilityLabel: 'Chat tab'/);
  assert.match(tabsLayout, /tabBarAccessibilityLabel: 'Archive tab'/);
  assert.match(tabsLayout, /tabBarButtonTestID: 'tab-home'/);
  assert.match(tabsLayout, /tabBarButtonTestID: 'tab-camera'/);
  assert.match(tabsLayout, /tabBarButtonTestID: 'tab-chat'/);
  assert.match(tabsLayout, /tabBarButtonTestID: 'tab-archive'/);

  const tabGlyph = readFileSync(join(appRoot, 'components', 'TabGlyph.tsx'), 'utf8');
  assert.match(tabGlyph, /activeIndicator/);
  assert.match(tabGlyph, /focused\s*\?/);
});

test('settings remains a secondary route with a reachable local reminder entry point', () => {
  assert.ok(existsSync(join(appRoot, 'app', 'settings.tsx')), 'settings route exists');

  const rootLayout = readFileSync(join(appRoot, 'app', '_layout.tsx'), 'utf8');
  const homeRoute = readFileSync(join(tabsRoot, 'index.tsx'), 'utf8');
  const settingsRoute = readFileSync(join(appRoot, 'app', 'settings.tsx'), 'utf8');

  assert.match(rootLayout, /<Stack\.Screen name="settings"/);
  assert.match(homeRoute, /href="\/settings"/);
  assert.match(homeRoute, /home-reminder-settings/);
  assert.match(settingsRoute, /screen-settings/);
  assert.match(settingsRoute, /settings-back-home/);
  assert.match(settingsRoute, /LocalReminderPanel/);
});

test('each route exposes a stable screen testID and no copied reference branding', () => {
  const routeFiles = ['index', 'camera', 'chat', 'archive'];
  const source = routeFiles
    .map((route) => readFileSync(join(tabsRoot, `${route}.tsx`), 'utf8'))
    .join('\n');

  assert.match(source, /screen-home/);
  assert.match(source, /screen-camera/);
  assert.match(source, /screen-chat/);
  assert.match(source, /screen-archive/);
  assert.doesNotMatch(source, /Instagram|Dazz Cam|Lapse|1SE/);
});

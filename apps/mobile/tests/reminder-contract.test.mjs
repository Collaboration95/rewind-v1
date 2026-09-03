import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('local reminders stay behind notification and repository ports', () => {
  const adapter = readFileSync(
    join(appRoot, 'platform', 'notifications', 'local-notifications.ts'),
    'utf8',
  );
  const store = readFileSync(
    join(appRoot, 'features', 'reminders', 'local-reminder-store.ts'),
    'utf8',
  );
  const panel = readFileSync(
    join(appRoot, 'features', 'reminders', 'LocalReminderPanel.tsx'),
    'utf8',
  );

  assert.match(adapter, /LocalNotificationsPort/);
  assert.match(adapter, /weekday: schedule\.weekday \+ 1/);
  assert.match(adapter, /DEMO_REMINDER_DELAY_SECONDS/);
  assert.match(adapter, /Linking\.openSettings/);
  assert.doesNotMatch(adapter, /getExpoPushTokenAsync|sendPush|https?:\/\//i);
  assert.match(store, /repository\.reminders\.save/);
  assert.match(store, /notifications\.scheduleWeekly/);
  assert.match(store, /notifications\.scheduleDemo/);
  assert.match(store, /demoNotificationId/);
  assert.match(panel, /LOCAL DEVICE ONLY · NO GROUP DELIVERY · NO SERVER/);
  assert.match(panel, /reminder-permission-action/);
});

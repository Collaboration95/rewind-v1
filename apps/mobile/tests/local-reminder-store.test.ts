import { describe, expect, it, jest } from '@jest/globals';

import { seededGroup, seededMembers, seededReminder } from '../../../packages/domain/src/fixtures';
import type { ReminderPreference } from '../../../packages/domain/src/models';

import {
  createLocalReminderStore,
  LocalReminderPermissionError,
  type LocalReminderRepository,
} from '../features/reminders/local-reminder-store';
import type {
  LocalNotificationPermission,
  LocalNotificationsPort,
} from '../platform/notifications/local-notifications';

const activeMember = seededMembers[0]!;

type ReminderHarnessOptions = {
  permission?: LocalNotificationPermission;
  preference?: Partial<ReminderPreference>;
  failNextSave?: boolean;
};

function createHarness({
  failNextSave = false,
  permission: initialPermission = 'granted',
  preference: preferenceOverrides = {},
}: ReminderHarnessOptions = {}) {
  let permission = initialPermission;
  let preference: ReminderPreference = {
    ...seededReminder,
    memberId: activeMember.id,
    ...preferenceOverrides,
  };
  let notificationSequence = 0;
  let shouldFailNextSave = failNextSave;

  const notifications: LocalNotificationsPort = {
    cancel: jest.fn(async () => undefined),
    getPermission: jest.fn(async () => permission),
    openSettings: jest.fn(async () => undefined),
    requestPermission: jest.fn(async () => {
      permission = 'granted';
      return permission;
    }),
    scheduleDemo: jest.fn(async () => `demo-${++notificationSequence}`),
    scheduleWeekly: jest.fn(async () => `weekly-${++notificationSequence}`),
  };
  const repository: LocalReminderRepository = {
    audit: { append: jest.fn(async () => undefined) },
    groups: { get: jest.fn(async () => seededGroup) },
    members: { get: jest.fn(async () => activeMember) },
    reminders: {
      get: jest.fn(async () => preference),
      save: jest.fn(async (nextPreference: ReminderPreference) => {
        if (shouldFailNextSave) {
          shouldFailNextSave = false;
          throw new Error('synthetic reminder persistence failure');
        }
        preference = nextPreference;
      }),
    },
    session: { getActiveMemberId: jest.fn(async () => activeMember.id) },
  };

  return {
    notifications,
    repository,
    store: createLocalReminderStore({
      notifications,
      now: () => '2026-09-02T10:00:00.000Z',
      repository,
    }),
  };
}

describe('local reminder store', () => {
  it('persists a weekly schedule and replaces the previous device notification', async () => {
    const harness = createHarness({
      preference: { enabled: true, notificationId: 'weekly-old' },
    });

    const snapshot = await harness.store.updateWeekly({ hour: 19, minute: 15, weekday: 2 });

    expect(harness.notifications.scheduleWeekly).toHaveBeenCalledWith({
      hour: 19,
      minute: 15,
      weekday: 2,
    });
    expect(harness.notifications.cancel).toHaveBeenCalledWith('weekly-old');
    expect(snapshot.preference).toMatchObject({
      enabled: true,
      hour: 19,
      minute: 15,
      notificationId: 'weekly-1',
      weekday: 2,
    });
    expect(harness.repository.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ action: 'local.reminder.weekly.updated' }),
        type: 'local.reminder.updated',
      }),
    );
  });

  it('enables, disables, schedules, and cancels local reminders without a server', async () => {
    const harness = createHarness();

    await harness.store.enableWeekly({ hour: 18, minute: 0, weekday: 0 });
    await harness.store.scheduleDemo();
    await harness.store.cancelDemo();
    const disabled = await harness.store.disableWeekly();

    expect(harness.notifications.scheduleWeekly).toHaveBeenCalledTimes(1);
    expect(harness.notifications.scheduleDemo).toHaveBeenCalledTimes(1);
    expect(harness.notifications.cancel).toHaveBeenCalledWith('demo-2');
    expect(harness.notifications.cancel).toHaveBeenCalledWith('weekly-1');
    expect(disabled.preference).toMatchObject({
      demoNotificationId: null,
      enabled: false,
      notificationId: null,
    });
  });

  it('rejects scheduling when permission is denied and leaves persistence untouched', async () => {
    const harness = createHarness({ permission: 'denied' });

    await expect(
      harness.store.enableWeekly({ hour: 18, minute: 0, weekday: 0 }),
    ).rejects.toBeInstanceOf(LocalReminderPermissionError);

    expect(harness.notifications.scheduleWeekly).not.toHaveBeenCalled();
    expect(harness.repository.reminders.save).not.toHaveBeenCalled();
  });

  it('cancels a newly scheduled notification when persistence fails', async () => {
    const harness = createHarness({ failNextSave: true });

    await expect(harness.store.enableWeekly({ hour: 18, minute: 0, weekday: 0 })).rejects.toThrow(
      'synthetic reminder persistence failure',
    );

    expect(harness.notifications.cancel).toHaveBeenCalledWith('weekly-1');
    expect(await harness.store.load()).toMatchObject({
      preference: {
        enabled: false,
        notificationId: null,
      },
    });
  });
});

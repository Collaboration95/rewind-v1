import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Notifications from 'expo-notifications';

import {
  createExpoLocalNotificationsPort,
  DEMO_REMINDER_DELAY_SECONDS,
} from '../platform/notifications/local-notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    WEEKLY: 'weekly',
  },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ canAskAgain: true, granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ canAskAgain: false, granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'notification-test'),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
}));

const scheduleNotificationAsync = jest.mocked(Notifications.scheduleNotificationAsync);
const getPermissionsAsync = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissionsAsync = jest.mocked(Notifications.requestPermissionsAsync);

function permissionResponse(
  granted: boolean,
  canAskAgain: boolean,
): Notifications.NotificationPermissionsStatus {
  return {
    canAskAgain,
    expires: 'never',
    granted,
    status: (granted
      ? 'granted'
      : 'denied') as Notifications.NotificationPermissionsStatus['status'],
  };
}

describe('Expo local notification adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps the local Sunday-based schedule to Expo weekday numbering', async () => {
    const notifications = createExpoLocalNotificationsPort();

    await notifications.scheduleWeekly({ hour: 19, minute: 30, weekday: 0 });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: {
          channelId: 'rewind-local-reminders',
          hour: 19,
          minute: 30,
          type: 'weekly',
          weekday: 1,
        },
      }),
    );
  });

  it('maps permission responses to safe UI states', async () => {
    const notifications = createExpoLocalNotificationsPort();

    getPermissionsAsync.mockResolvedValueOnce(permissionResponse(false, true));
    expect(await notifications.getPermission()).toBe('denied');

    getPermissionsAsync.mockResolvedValueOnce(permissionResponse(false, false));
    expect(await notifications.getPermission()).toBe('blocked');

    requestPermissionsAsync.mockResolvedValueOnce(permissionResponse(true, false));
    expect(await notifications.requestPermission()).toBe('granted');
  });

  it('schedules the short demo reminder as a local time interval', async () => {
    const notifications = createExpoLocalNotificationsPort();

    await notifications.scheduleDemo();

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: {
          channelId: 'rewind-local-reminders',
          seconds: DEMO_REMINDER_DELAY_SECONDS,
          type: 'timeInterval',
        },
      }),
    );
  });
});

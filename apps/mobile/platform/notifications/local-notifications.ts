import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const DEMO_REMINDER_DELAY_SECONDS = 10;

export type LocalNotificationPermission = 'blocked' | 'denied' | 'granted' | 'unavailable';

export interface LocalReminderSchedule {
  /** Sunday is 0 in the local domain model; the adapter maps it for Expo. */
  readonly hour: number;
  readonly minute: number;
  readonly weekday: number;
}

export interface LocalNotificationsPort {
  cancel(notificationId: string): Promise<void>;
  getPermission(): Promise<LocalNotificationPermission>;
  openSettings(): Promise<void>;
  requestPermission(): Promise<LocalNotificationPermission>;
  scheduleDemo(): Promise<string>;
  scheduleWeekly(schedule: LocalReminderSchedule): Promise<string>;
}

const LOCAL_REMINDER_CHANNEL = 'rewind-local-reminders';

export function createExpoLocalNotificationsPort(): LocalNotificationsPort {
  configureForegroundNotifications();

  return {
    async cancel(notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    },

    async getPermission() {
      try {
        return toPermission(await Notifications.getPermissionsAsync());
      } catch {
        return 'unavailable';
      }
    },

    async openSettings() {
      await Linking.openSettings();
    },

    async requestPermission() {
      try {
        return toPermission(
          await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: false, allowSound: false },
          }),
        );
      } catch {
        return 'unavailable';
      }
    },

    async scheduleDemo() {
      await ensureAndroidChannel();
      return Notifications.scheduleNotificationAsync({
        content: {
          body: 'This is a ten-second local-device reminder. Nothing was sent to anyone.',
          data: { source: 'rewind-local-demo-reminder' },
          title: 'Hold onto this week',
        },
        trigger: {
          channelId: LOCAL_REMINDER_CHANNEL,
          seconds: DEMO_REMINDER_DELAY_SECONDS,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        },
      });
    },

    async scheduleWeekly(schedule) {
      assertSchedule(schedule);
      await ensureAndroidChannel();
      return Notifications.scheduleNotificationAsync({
        content: {
          body: 'Your Rewind reminder is scheduled on this device. Nothing was sent to your group.',
          data: { source: 'rewind-local-weekly-reminder' },
          title: 'Hold onto this week',
        },
        trigger: {
          channelId: LOCAL_REMINDER_CHANNEL,
          hour: schedule.hour,
          minute: schedule.minute,
          // Expo's weekly trigger is Sunday=1 through Saturday=7.
          weekday: schedule.weekday + 1,
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        },
      });
    },
  };
}

function configureForegroundNotifications(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // The adapter reports unavailable permission rather than blocking the local UI.
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(LOCAL_REMINDER_CHANNEL, {
    importance: Notifications.AndroidImportance.DEFAULT,
    name: 'Rewind local reminders',
    sound: null,
  });
}

function toPermission(response: {
  canAskAgain: boolean;
  granted: boolean;
}): LocalNotificationPermission {
  if (response.granted) {
    return 'granted';
  }
  return response.canAskAgain ? 'denied' : 'blocked';
}

function assertSchedule(schedule: LocalReminderSchedule): void {
  if (
    !Number.isInteger(schedule.weekday) ||
    schedule.weekday < 0 ||
    schedule.weekday > 6 ||
    !Number.isInteger(schedule.hour) ||
    schedule.hour < 0 ||
    schedule.hour > 23 ||
    !Number.isInteger(schedule.minute) ||
    schedule.minute < 0 ||
    schedule.minute > 59
  ) {
    throw new Error('The local reminder schedule is invalid.');
  }
}

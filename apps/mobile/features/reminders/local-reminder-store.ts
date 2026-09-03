import { seededReminder } from '../../../../packages/domain/src/fixtures.ts';
import type {
  AuditEventId,
  Member,
  MemberId,
  ReminderPreference,
} from '../../../../packages/domain/src/models.ts';
import type {
  AuditRepositoryPort,
  GroupRepositoryPort,
  MemberRepositoryPort,
  ReminderRepositoryPort,
  SessionRepositoryPort,
} from '../../../../packages/domain/src/ports.ts';

import {
  type LocalNotificationPermission,
  type LocalNotificationsPort,
  type LocalReminderSchedule,
} from '../../platform/notifications/local-notifications.ts';
import { DEMO_GROUP_ID } from '../session/session.ts';

export type LocalReminderStatus = 'error' | 'loading' | 'ready';

export interface LocalReminderSnapshot {
  readonly member: Member;
  readonly permission: LocalNotificationPermission;
  readonly preference: ReminderPreference;
}

export interface LocalReminderStore {
  cancelDemo(): Promise<LocalReminderSnapshot>;
  disableWeekly(): Promise<LocalReminderSnapshot>;
  enableWeekly(schedule: LocalReminderSchedule): Promise<LocalReminderSnapshot>;
  load(): Promise<LocalReminderSnapshot>;
  openSettings(): Promise<LocalReminderSnapshot>;
  requestPermission(): Promise<LocalReminderSnapshot>;
  scheduleDemo(): Promise<LocalReminderSnapshot>;
  updateWeekly(schedule: LocalReminderSchedule): Promise<LocalReminderSnapshot>;
}

export interface LocalReminderRepository {
  readonly audit: Pick<AuditRepositoryPort, 'append'>;
  readonly groups: Pick<GroupRepositoryPort, 'get'>;
  readonly members: Pick<MemberRepositoryPort, 'get'>;
  readonly reminders: Pick<ReminderRepositoryPort, 'get' | 'save'>;
  readonly session: Pick<SessionRepositoryPort, 'getActiveMemberId'>;
}

export interface LocalReminderStoreOptions {
  readonly nextAuditId?: (action: string, memberId: MemberId) => AuditEventId;
  readonly notifications: LocalNotificationsPort;
  readonly now?: () => string;
  readonly repository: LocalReminderRepository;
}

export function createLocalReminderStore({
  nextAuditId,
  notifications,
  now = () => new Date().toISOString(),
  repository,
}: LocalReminderStoreOptions): LocalReminderStore {
  let auditSequence = 0;
  const createAuditId =
    nextAuditId ??
    ((action: string, memberId: MemberId) => `reminder-${action}-${memberId}-${++auditSequence}`);

  const loadContext = async () => {
    const group = await repository.groups.get(DEMO_GROUP_ID);
    if (!group) {
      throw new Error('The local reminder group could not be restored.');
    }

    const memberId = await repository.session.getActiveMemberId(group.id);
    if (!memberId || !group.memberIds.includes(memberId)) {
      throw new Error('The local reminder profile could not be restored.');
    }

    const member = await repository.members.get(memberId);
    if (!member) {
      throw new Error('The local reminder profile could not be restored.');
    }

    const preference = (await repository.reminders.get(member.id)) ?? {
      ...seededReminder,
      memberId: member.id,
    };
    return { member, preference };
  };

  const snapshotFor = async (
    member: Member,
    preference: ReminderPreference,
  ): Promise<LocalReminderSnapshot> => ({
    member,
    permission: await notifications.getPermission(),
    preference,
  });

  return {
    async cancelDemo() {
      const { member, preference } = await loadContext();
      const updated = { ...preference, demoNotificationId: null };
      try {
        await repository.reminders.save(updated);
        if (preference.demoNotificationId) {
          await notifications.cancel(preference.demoNotificationId);
        }
      } catch (error) {
        await repository.reminders.save(preference).catch(() => undefined);
        throw error;
      }
      await appendAudit(repository, createAuditId, now, 'demo-cancelled', member.id, {
        action: 'local.reminder.demo.cancelled',
      });
      return snapshotFor(member, updated);
    },

    async disableWeekly() {
      const { member, preference } = await loadContext();
      const updated = { ...preference, enabled: false, notificationId: null };
      try {
        await repository.reminders.save(updated);
        if (preference.notificationId) {
          await notifications.cancel(preference.notificationId);
        }
      } catch (error) {
        await repository.reminders.save(preference).catch(() => undefined);
        throw error;
      }
      await appendAudit(repository, createAuditId, now, 'weekly-disabled', member.id, {
        action: 'local.reminder.weekly.disabled',
      });
      return snapshotFor(member, updated);
    },

    async enableWeekly(schedule) {
      const { member, preference } = await loadContext();
      return scheduleWeekly({ member, preference, schedule, event: 'enabled' });
    },

    async load() {
      const { member, preference } = await loadContext();
      return snapshotFor(member, preference);
    },

    async openSettings() {
      const { member, preference } = await loadContext();
      await notifications.openSettings();
      return snapshotFor(member, preference);
    },

    async requestPermission() {
      const { member, preference } = await loadContext();
      const permission = await notifications.requestPermission();
      await appendAudit(repository, createAuditId, now, 'permission-requested', member.id, {
        action: 'local.reminder.permission.requested',
        granted: permission === 'granted',
      });
      return { member, permission, preference };
    },

    async scheduleDemo() {
      const { member, preference } = await loadContext();
      const permission = await notifications.getPermission();
      if (permission !== 'granted') {
        throw new LocalReminderPermissionError(permission);
      }

      const newNotificationId = await notifications.scheduleDemo();
      const updated = { ...preference, demoNotificationId: newNotificationId };
      try {
        await repository.reminders.save(updated);
        if (preference.demoNotificationId) {
          await notifications.cancel(preference.demoNotificationId);
        }
      } catch (error) {
        await repository.reminders.save(preference).catch(() => undefined);
        await notifications.cancel(newNotificationId).catch(() => undefined);
        throw error;
      }
      await appendAudit(repository, createAuditId, now, 'demo-scheduled', member.id, {
        action: 'local.reminder.demo.scheduled',
      });
      return snapshotFor(member, updated);
    },

    async updateWeekly(schedule) {
      const { member, preference } = await loadContext();
      if (!preference.enabled) {
        throw new Error('The local reminder is not enabled.');
      }
      return scheduleWeekly({ member, preference, schedule, event: 'updated' });
    },
  };

  async function scheduleWeekly({
    event,
    member,
    preference,
    schedule,
  }: {
    readonly event: 'enabled' | 'updated';
    readonly member: Member;
    readonly preference: ReminderPreference;
    readonly schedule: LocalReminderSchedule;
  }): Promise<LocalReminderSnapshot> {
    const permission = await notifications.getPermission();
    if (permission !== 'granted') {
      throw new LocalReminderPermissionError(permission);
    }

    const newNotificationId = await notifications.scheduleWeekly(schedule);
    const updated = {
      ...preference,
      ...schedule,
      enabled: true,
      notificationId: newNotificationId,
    };

    try {
      await repository.reminders.save(updated);
      if (preference.notificationId) {
        await notifications.cancel(preference.notificationId);
      }
    } catch (error) {
      await repository.reminders.save(preference).catch(() => undefined);
      await notifications.cancel(newNotificationId).catch(() => undefined);
      throw error;
    }

    await appendAudit(repository, createAuditId, now, `weekly-${event}`, member.id, {
      action: `local.reminder.weekly.${event}`,
      hour: schedule.hour,
      minute: schedule.minute,
      weekday: schedule.weekday,
    });
    return snapshotFor(member, updated);
  }
}

export class LocalReminderPermissionError extends Error {
  public readonly permission: LocalNotificationPermission;

  public constructor(permission: LocalNotificationPermission) {
    super('Local notification permission is not available.');
    this.name = 'LocalReminderPermissionError';
    this.permission = permission;
  }
}

export async function createSqliteLocalReminderStore(): Promise<LocalReminderStore> {
  const [{ openLocalDatabase }, { createExpoLocalNotificationsPort }] = await Promise.all([
    import('../../data/local/database.ts'),
    import('../../platform/notifications/local-notifications.ts'),
  ]);
  const database = await openLocalDatabase();
  return createLocalReminderStore({
    notifications: createExpoLocalNotificationsPort(),
    repository: database.repository,
  });
}

async function appendAudit(
  repository: LocalReminderRepository,
  createAuditId: (action: string, memberId: MemberId) => AuditEventId,
  now: () => string,
  action: string,
  memberId: MemberId,
  metadata: Readonly<Record<string, boolean | number | string>>,
): Promise<void> {
  await repository.audit.append({
    at: now(),
    id: createAuditId(action, memberId),
    metadata,
    subjectId: memberId,
    type: 'local.reminder.updated',
  });
}

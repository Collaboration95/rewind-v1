import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { seededGroup, seededMembers, seededReminder } from '../../../packages/domain/src/fixtures';
import type { ReminderPreference } from '../../../packages/domain/src/models';
import type {
  SessionPolicyContext,
  SessionSelectionOutcome,
} from '../../../packages/domain/src/session/local-session';

import { LocalReminderPanel } from '../features/reminders/LocalReminderPanel';
import type {
  LocalReminderSnapshot,
  LocalReminderStore,
} from '../features/reminders/local-reminder-store';
import type { LocalReminderSchedule } from '../platform/notifications/local-notifications';
import { LocalSessionProvider } from '../features/session/LocalSessionProvider';
import type { LocalSessionStore } from '../features/session/session';

const activeMember = seededMembers[0]!;

function createSessionStore(): LocalSessionStore {
  return {
    load: jest.fn(async () => ({
      activeMemberId: activeMember.id,
      group: seededGroup,
      members: seededMembers,
    })),
    selectMember: jest.fn(
      async (
        _memberId: string,
        _context: SessionPolicyContext,
      ): Promise<SessionSelectionOutcome> => ({
        accepted: false,
        auditEvent: {
          at: '2026-09-02T10:00:00.000Z',
          id: 'session-test',
          metadata: { action: 'rejected' },
          subjectId: activeMember.id,
          type: 'session.profile.rejected',
        },
        code: 'not-a-group-member',
        reason: 'Choose one of the five local demo profiles.',
      }),
    ),
  };
}

function createReminderHarness(
  permission: LocalReminderSnapshot['permission'] = 'granted',
  preferenceOverrides: Partial<ReminderPreference> = {},
) {
  let currentPermission = permission;
  let currentPreference: ReminderPreference = {
    ...seededReminder,
    memberId: activeMember.id,
    ...preferenceOverrides,
  };
  const member = activeMember;
  const snapshot = (): LocalReminderSnapshot => ({
    member,
    permission: currentPermission,
    preference: currentPreference,
  });
  const store: LocalReminderStore = {
    cancelDemo: jest.fn(async () => {
      currentPreference = { ...currentPreference, demoNotificationId: null };
      return snapshot();
    }),
    disableWeekly: jest.fn(async () => {
      currentPreference = { ...currentPreference, enabled: false, notificationId: null };
      return snapshot();
    }),
    enableWeekly: jest.fn(async (schedule: LocalReminderSchedule) => {
      currentPreference = {
        ...currentPreference,
        ...schedule,
        enabled: true,
        notificationId: 'weekly-test',
      };
      return snapshot();
    }),
    load: jest.fn(async () => snapshot()),
    openSettings: jest.fn(async () => snapshot()),
    requestPermission: jest.fn(async () => {
      currentPermission = 'granted';
      return snapshot();
    }),
    scheduleDemo: jest.fn(async () => {
      currentPreference = { ...currentPreference, demoNotificationId: 'demo-test' };
      return snapshot();
    }),
    updateWeekly: jest.fn(async (schedule: LocalReminderSchedule) => {
      currentPreference = { ...currentPreference, ...schedule, notificationId: 'weekly-updated' };
      return snapshot();
    }),
  };

  return { store, snapshot };
}

function renderPanel(store: LocalReminderStore) {
  return render(
    <LocalSessionProvider store={createSessionStore()}>
      <LocalReminderPanel store={store} />
    </LocalSessionProvider>,
  );
}

describe('LocalReminderPanel', () => {
  it('configures and updates an enabled local schedule', async () => {
    const harness = createReminderHarness('granted', {
      enabled: true,
      notificationId: 'weekly-old',
    });
    const view = await renderPanel(harness.store);

    await waitFor(() => expect(view.getByTestId('local-reminder-panel')).toBeTruthy());
    await fireEvent.press(view.getByTestId('reminder-weekday-2'));
    await fireEvent.press(view.getByTestId('reminder-time-later'));
    expect(view.getByTestId('reminder-weekly-toggle').props.accessibilityLabel).toBe(
      'UPDATE LOCAL SCHEDULE',
    );

    await fireEvent.press(view.getByTestId('reminder-weekly-toggle'));

    expect(harness.store.updateWeekly).toHaveBeenCalledWith({ hour: 18, minute: 15, weekday: 2 });
    await waitFor(() =>
      expect(view.getByTestId('reminder-weekly-toggle').props.accessibilityLabel).toBe(
        'TURN LOCAL REMINDER OFF',
      ),
    );
  });

  it('shows an actionable blocked-permission recovery state', async () => {
    const harness = createReminderHarness('blocked');
    const view = await renderPanel(harness.store);

    await waitFor(() => expect(view.getByTestId('reminder-permission-action')).toBeTruthy());
    expect(
      view.getByText(
        'Notifications are blocked in device settings. Open Settings, allow them, then return here.',
      ),
    ).toBeTruthy();

    await fireEvent.press(view.getByTestId('reminder-permission-action'));
    expect(harness.store.openSettings).toHaveBeenCalledTimes(1);
  });

  it('requests denied permission and then exposes local scheduling controls', async () => {
    const harness = createReminderHarness('denied');
    const view = await renderPanel(harness.store);

    await waitFor(() => expect(view.getByTestId('reminder-permission-action')).toBeTruthy());
    await fireEvent.press(view.getByTestId('reminder-permission-action'));

    await waitFor(() => expect(view.getByTestId('reminder-weekly-toggle')).toBeTruthy());
    expect(harness.store.requestPermission).toHaveBeenCalledTimes(1);
    expect(view.getByText('THIS DEVICE')).toBeTruthy();
  });

  it('schedules and cancels the ten-second local demo reminder', async () => {
    const harness = createReminderHarness();
    const view = await renderPanel(harness.store);

    await waitFor(() => expect(view.getByTestId('reminder-demo-toggle')).toBeTruthy());
    await fireEvent.press(view.getByTestId('reminder-demo-toggle'));
    await waitFor(() => expect(view.getByText('CANCEL 10-SECOND DEMO')).toBeTruthy());
    expect(harness.store.scheduleDemo).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByTestId('reminder-demo-toggle'));
    await waitFor(() => expect(view.getByText('SCHEDULE 10-SECOND DEMO')).toBeTruthy());
    expect(harness.store.cancelDemo).toHaveBeenCalledTimes(1);
  });
});

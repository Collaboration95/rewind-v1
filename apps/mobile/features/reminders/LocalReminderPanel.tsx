import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../../components/FrameCard';
import { colors, radii, spacing, typography } from '../../components/tokens';
import { useLocalSession } from '../session/LocalSessionProvider';
import {
  LocalReminderPermissionError,
  type LocalReminderSnapshot,
  type LocalReminderStore,
} from './local-reminder-store';

type PendingAction = 'demo' | 'disable' | 'enable' | 'permission' | 'settings' | 'update' | null;

type ReminderLoadState = {
  readonly key: string;
  readonly status: 'error' | 'loading' | 'ready';
};

export type LocalReminderPanelProps = {
  store?: LocalReminderStore;
};

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export function LocalReminderPanel({ store: providedStore }: LocalReminderPanelProps) {
  const { activeMember } = useLocalSession();
  const [store, setStore] = useState<LocalReminderStore | null>(providedStore ?? null);
  const [snapshot, setSnapshot] = useState<LocalReminderSnapshot | null>(null);
  const [loadState, setLoadState] = useState<ReminderLoadState>({
    key: '',
    status: 'loading',
  });
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [draft, setDraft] = useState({ hour: 18, minute: 0, weekday: 0 });
  const [retryToken, setRetryToken] = useState(0);
  const requestKey = `${activeMember?.id ?? 'session-loading'}:${retryToken}`;
  const status = loadState.key === requestKey ? loadState.status : 'loading';

  useEffect(() => {
    let cancelled = false;

    const storePromise = providedStore
      ? Promise.resolve(providedStore)
      : import('./local-reminder-store').then(({ createSqliteLocalReminderStore }) =>
          createSqliteLocalReminderStore(),
        );

    void storePromise
      .then(async (resolvedStore) => {
        if (cancelled) {
          return null;
        }
        setStore(resolvedStore);
        return resolvedStore.load();
      })
      .then((nextSnapshot) => {
        if (!nextSnapshot || cancelled) {
          return;
        }
        setSnapshot(nextSnapshot);
        setDraft({
          hour: nextSnapshot.preference.hour,
          minute: nextSnapshot.preference.minute,
          weekday: nextSnapshot.preference.weekday,
        });
        setError(null);
        setPendingAction(null);
        setLoadState({ key: requestKey, status: 'ready' });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSnapshot(null);
        setError('The local reminder settings could not be restored. Try again.');
        setPendingAction(null);
        setLoadState({ key: requestKey, status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [activeMember?.id, providedStore, requestKey, retryToken]);

  const updateSnapshot = useCallback((nextSnapshot: LocalReminderSnapshot) => {
    setSnapshot(nextSnapshot);
    setDraft({
      hour: nextSnapshot.preference.hour,
      minute: nextSnapshot.preference.minute,
      weekday: nextSnapshot.preference.weekday,
    });
    setError(null);
  }, []);

  const run = useCallback(
    async (
      action: PendingAction,
      operation: (currentStore: LocalReminderStore) => Promise<LocalReminderSnapshot>,
    ) => {
      if (!store || pendingAction !== null || action === null) {
        return;
      }

      setPendingAction(action);
      setError(null);
      try {
        updateSnapshot(await operation(store));
      } catch (caught) {
        setError(reminderErrorCopy(caught));
      } finally {
        setPendingAction(null);
      }
    },
    [pendingAction, store, updateSnapshot],
  );

  const scheduleChanged = useMemo(
    () =>
      snapshot !== null &&
      (draft.weekday !== snapshot.preference.weekday ||
        draft.hour !== snapshot.preference.hour ||
        draft.minute !== snapshot.preference.minute),
    [draft, snapshot],
  );

  const saveWeekly = useCallback(() => {
    if (!snapshot) {
      return;
    }
    if (snapshot.preference.enabled) {
      if (scheduleChanged) {
        void run('update', (currentStore) => currentStore.updateWeekly(draft));
      } else {
        void run('disable', (currentStore) => currentStore.disableWeekly());
      }
      return;
    }
    void run('enable', (currentStore) => currentStore.enableWeekly(draft));
  }, [draft, run, scheduleChanged, snapshot]);

  const scheduleDemo = useCallback(() => {
    if (!snapshot) {
      return;
    }
    void run('demo', (currentStore) =>
      snapshot.preference.demoNotificationId
        ? currentStore.cancelDemo()
        : currentStore.scheduleDemo(),
    );
  }, [run, snapshot]);

  const permissionAction = useCallback(() => {
    if (!snapshot) {
      return;
    }
    if (snapshot.permission === 'blocked') {
      void run('settings', (currentStore) => currentStore.openSettings());
      return;
    }
    void run('permission', (currentStore) => currentStore.requestPermission());
  }, [run, snapshot]);

  const adjustTime = useCallback((minutes: number) => {
    setDraft((current) => {
      const total = (current.hour * 60 + current.minute + minutes + 24 * 60) % (24 * 60);
      return { ...current, hour: Math.floor(total / 60), minute: total % 60 };
    });
  }, []);

  const scheduleLabel = useMemo(() => formatSchedule(draft), [draft]);
  const isBusy = pendingAction !== null;

  if (status === 'loading') {
    return <ReminderState label="RESTORING LOCAL REMINDER…" testID="reminder-loading" />;
  }

  if (status === 'error' || !snapshot) {
    return (
      <FrameCard
        accessible={false}
        accessibilityLabel="Local reminder settings need attention"
        accent={colors.flash}
        testID="reminder-error-state"
      >
        <Text style={styles.kicker}>LOCAL REMINDER</Text>
        <Text accessibilityRole="alert" style={styles.errorCopy} testID="reminder-error">
          {error ?? 'The local reminder settings could not be restored. Try again.'}
        </Text>
        <ActionButton
          disabled={false}
          label="TRY REMINDER AGAIN"
          onPress={() => setRetryToken((current) => current + 1)}
          secondary
          testID="reminder-retry"
        />
      </FrameCard>
    );
  }

  const permissionCopy = permissionDescription(snapshot.permission);
  const demoScheduled = snapshot.preference.demoNotificationId !== null;

  return (
    <FrameCard
      accessible={false}
      accessibilityLabel={`Local device reminder for ${snapshot.member.displayName}`}
      accent={colors.acid}
      testID="local-reminder-panel"
    >
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>LOCAL REMINDER</Text>
        <Text style={styles.mode}>THIS DEVICE</Text>
      </View>
      <Text style={styles.title}>HOLD A MOMENT</Text>
      <Text style={styles.body}>
        Schedule one private device reminder for {snapshot.member.displayName}. It is not sent to
        your group.
      </Text>

      <View
        accessible
        accessibilityLabel={`Notification access: ${permissionCopy}`}
        style={styles.statusBlock}
        testID="reminder-permission-status"
      >
        <Text style={[styles.phase, snapshot.permission === 'granted' && styles.phaseReady]}>
          {permissionLabel(snapshot.permission)}
        </Text>
        <Text style={styles.body}>{permissionCopy}</Text>
      </View>

      {snapshot.permission === 'granted' ? (
        <View style={styles.scheduleBlock}>
          <Text style={styles.sectionLabel}>WEEKLY LOCAL SCHEDULE</Text>
          <View style={styles.weekdayRow}>
            {weekdays.map((label, weekday) => (
              <Pressable
                accessibilityLabel={`Set local reminder day to ${weekdayName(weekday)}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy, selected: draft.weekday === weekday }}
                disabled={isBusy}
                key={label}
                onPress={() => setDraft((current) => ({ ...current, weekday }))}
                style={({ pressed }) => [
                  styles.dayButton,
                  draft.weekday === weekday && styles.dayButtonSelected,
                  pressed && styles.pressed,
                  isBusy && styles.disabled,
                ]}
                testID={`reminder-weekday-${weekday}`}
              >
                <Text
                  style={[styles.dayLabel, draft.weekday === weekday && styles.dayLabelSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.timeRow}>
            <ActionButton
              disabled={isBusy}
              label="15 MINUTES EARLIER"
              onPress={() => adjustTime(-15)}
              secondary
              testID="reminder-time-earlier"
            />
            <View
              accessible
              accessibilityLabel={`Reminder time: ${scheduleLabel}`}
              style={styles.timeReadout}
            >
              <Text style={styles.timeLabel}>REMIND</Text>
              <Text style={styles.timeValue} testID="reminder-time-value">
                {scheduleLabel}
              </Text>
            </View>
            <ActionButton
              disabled={isBusy}
              label="15 MINUTES LATER"
              onPress={() => adjustTime(15)}
              secondary
              testID="reminder-time-later"
            />
          </View>
          <ActionButton
            disabled={isBusy}
            label={
              pendingAction === 'enable'
                ? 'SAVING LOCAL REMINDER…'
                : pendingAction === 'disable'
                  ? 'TURNING LOCAL REMINDER OFF…'
                  : pendingAction === 'update'
                    ? 'UPDATING LOCAL SCHEDULE…'
                    : snapshot.preference.enabled
                      ? scheduleChanged
                        ? 'UPDATE LOCAL SCHEDULE'
                        : 'TURN LOCAL REMINDER OFF'
                      : 'TURN LOCAL REMINDER ON'
            }
            onPress={saveWeekly}
            secondary={snapshot.preference.enabled}
            testID="reminder-weekly-toggle"
          />
        </View>
      ) : (
        <ActionButton
          disabled={isBusy || snapshot.permission === 'unavailable'}
          label={
            pendingAction === 'settings'
              ? 'OPENING DEVICE SETTINGS…'
              : pendingAction === 'permission'
                ? 'REQUESTING LOCAL NOTIFICATIONS…'
                : snapshot.permission === 'blocked'
                  ? 'OPEN DEVICE SETTINGS'
                  : snapshot.permission === 'unavailable'
                    ? 'NOTIFICATIONS UNAVAILABLE'
                    : 'ALLOW LOCAL NOTIFICATIONS'
          }
          onPress={permissionAction}
          testID="reminder-permission-action"
        />
      )}

      {snapshot.permission === 'granted' ? (
        <ActionButton
          disabled={isBusy}
          label={
            pendingAction === 'demo'
              ? demoScheduled
                ? 'CANCELLING DEMO REMINDER…'
                : 'SCHEDULING DEMO REMINDER…'
              : demoScheduled
                ? 'CANCEL 10-SECOND DEMO'
                : 'SCHEDULE 10-SECOND DEMO'
          }
          onPress={scheduleDemo}
          secondary
          testID="reminder-demo-toggle"
        />
      ) : null}

      {error ? (
        <Text accessibilityRole="alert" style={styles.errorCopy} testID="reminder-action-error">
          {error}
        </Text>
      ) : null}
      <Text style={styles.disclosure}>LOCAL DEVICE ONLY · NO GROUP DELIVERY · NO SERVER</Text>
    </FrameCard>
  );
}

function ReminderState({ label, testID }: { label: string; testID: string }) {
  return (
    <FrameCard
      accessibilityLabel="Local reminder settings are loading"
      accent={colors.acid}
      testID={testID}
    >
      <Text style={styles.kicker}>LOCAL REMINDER</Text>
      <Text style={styles.body}>{label}</Text>
    </FrameCard>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  secondary = false,
  testID,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary ? styles.actionButtonSecondary : styles.actionButtonPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Text style={secondary ? styles.actionLabelSecondary : styles.actionLabelPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatSchedule(schedule: { hour: number; minute: number; weekday: number }): string {
  const suffix = schedule.hour >= 12 ? 'PM' : 'AM';
  const hour = schedule.hour % 12 || 12;
  return `${weekdayName(schedule.weekday)} · ${hour}:${String(schedule.minute).padStart(2, '0')} ${suffix}`;
}

function weekdayName(weekday: number): string {
  return (
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday] ??
    'Sunday'
  );
}

function permissionLabel(permission: LocalReminderSnapshot['permission']): string {
  return {
    blocked: 'ACCESS BLOCKED',
    denied: 'ACTION NEEDED',
    granted: 'ACCESS READY',
    unavailable: 'UNAVAILABLE',
  }[permission];
}

function permissionDescription(permission: LocalReminderSnapshot['permission']): string {
  switch (permission) {
    case 'blocked':
      return 'Notifications are blocked in device settings. Open Settings, allow them, then return here.';
    case 'denied':
      return 'Allow notifications to schedule a reminder on this device.';
    case 'granted':
      return 'This device can schedule a weekly reminder and a short local demo.';
    case 'unavailable':
      return 'Notifications are not available in this environment. No reminder was scheduled.';
  }
}

function reminderErrorCopy(error: unknown): string {
  if (error instanceof LocalReminderPermissionError) {
    return permissionDescription(error.permission);
  }
  return 'The local reminder could not be updated. Try again.';
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.control,
  },
  actionButtonPrimary: { backgroundColor: colors.acid, borderColor: colors.acid, borderWidth: 1 },
  actionButtonSecondary: { borderColor: colors.paper, borderWidth: 1 },
  actionLabelPrimary: { ...typography.utility, color: colors.ink, fontSize: 10 },
  actionLabelSecondary: { ...typography.utility, color: colors.paper, fontSize: 10 },
  body: { ...typography.bodySmall, color: colors.muted },
  dayButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.micro,
  },
  dayButtonSelected: { backgroundColor: colors.acid, borderColor: colors.acid },
  dayLabel: { ...typography.utility, color: colors.muted, fontSize: 9 },
  dayLabelSelected: { color: colors.ink },
  disclosure: { ...typography.utility, color: colors.acid, fontSize: 9, letterSpacing: 1.1 },
  disabled: { opacity: 0.5 },
  errorCopy: { ...typography.bodySmall, color: colors.flash },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { ...typography.label, color: colors.paper },
  mode: { ...typography.utility, color: colors.muted, fontSize: 10 },
  phase: { ...typography.utility, color: colors.flash },
  phaseReady: { color: colors.acid },
  pressed: { opacity: 0.72 },
  scheduleBlock: { gap: spacing.compact },
  sectionLabel: { ...typography.utility, color: colors.paper, fontSize: 10 },
  statusBlock: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.micro,
    paddingBottom: spacing.inset,
  },
  timeLabel: { ...typography.utility, color: colors.muted, fontSize: 9 },
  timeReadout: { alignItems: 'center', flex: 1, gap: spacing.micro },
  timeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.micro },
  timeValue: {
    ...typography.bodySmall,
    color: colors.paper,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: { ...typography.title, color: colors.paper, fontSize: 24, lineHeight: 28 },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.micro },
});

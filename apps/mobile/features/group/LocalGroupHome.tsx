import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  MAX_CONTRIBUTIONS_PER_MEMBER,
  MAX_TOTAL_DURATION_SECONDS,
} from '../../../../packages/domain/src/policy';
import type { CycleStatus, SafeContributionSummary } from '../../../../packages/domain/src/models';

import { FrameCard } from '../../components/FrameCard';
import { colors, radii, spacing, typography } from '../../components/tokens';
import { useLocalSession } from '../session/LocalSessionProvider';
import { memberNameForSummary, type LocalHomeSnapshot, type LocalHomeStore } from './local-home';

type LocalGroupHomeProps = {
  store?: LocalHomeStore;
};

type HomeStatus = 'error' | 'loading' | 'ready';

export function LocalGroupHome({ store: providedStore }: LocalGroupHomeProps) {
  const { activeMember } = useLocalSession();
  const [status, setStatus] = useState<HomeStatus>('loading');
  const [snapshot, setSnapshot] = useState<LocalHomeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const storePromise = providedStore
      ? Promise.resolve(providedStore)
      : import('./sqlite-home-store').then(({ createSqliteLocalHomeStore }) =>
          createSqliteLocalHomeStore(),
        );

    void storePromise
      .then((resolvedStore) => resolvedStore.load())
      .then((nextSnapshot) => {
        if (cancelled) {
          return;
        }
        setSnapshot(nextSnapshot);
        setError(null);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSnapshot(null);
        setError('The local group home could not be restored. Try again.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [activeMember?.id, providedStore, retryToken]);

  if (status === 'loading') {
    return (
      <View
        accessible
        accessibilityLabel="Local group home is loading"
        style={styles.stateBlock}
        testID="home-loading"
      >
        <Text style={styles.stateLabel}>RESTORING LOCAL GROUP</Text>
        <Text style={styles.stateBody}>Loading the seeded group and lock-safe activity.</Text>
      </View>
    );
  }

  if (status === 'error' || !snapshot) {
    return (
      <View style={styles.stateBlock} testID="home-error-state">
        <Text accessibilityRole="alert" style={styles.errorText} testID="home-error">
          {error ?? 'The local group home could not be restored. Try again.'}
        </Text>
        <Pressable
          accessibilityLabel="Retry local group home"
          accessibilityRole="button"
          onPress={() => setRetryToken((current) => current + 1)}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          testID="home-retry"
        >
          <Text style={styles.retryLabel}>TRY AGAIN</Text>
        </Pressable>
      </View>
    );
  }

  return <ReadyGroupHome snapshot={snapshot} />;
}

function ReadyGroupHome({ snapshot }: { snapshot: LocalHomeSnapshot }) {
  const { activeMember, budget, contributions, cycle, group, members } = snapshot;
  const cycleLabel = cycleStatusLabel(cycle?.status ?? null);
  const actorName = activeMember?.displayName ?? 'LOCAL ACTOR';

  return (
    <View style={styles.surface} testID="home-group-surface">
      <FrameCard
        accessible={false}
        accessibilityLabel={`${group.name}. Weekly prompt: ${group.prompt}. Cycle status: ${cycleLabel}.`}
        accent={colors.acid}
        testID="home-group-summary"
      >
        <Text style={styles.kicker}>LOCAL GROUP</Text>
        <Text style={styles.groupName} testID="home-group-name">
          {group.name}
        </Text>
        <Text style={styles.promptLabel}>THIS WEEK&apos;S PROMPT</Text>
        <Text style={styles.prompt} testID="home-group-prompt">
          {group.prompt}
        </Text>
        <View style={styles.cycleRow}>
          <HomeMetric label="CYCLE" testID="home-cycle-status" value={cycleLabel} />
          <HomeMetric label="ACTOR" testID="home-active-actor" value={actorName} />
        </View>
        <Text style={styles.disclosure}>LOCAL GROUP · DEVICE STATE ONLY</Text>
      </FrameCard>

      <FrameCard
        accessible={false}
        accessibilityLabel={`${actorName} quota: ${formatCount(budget?.usedCount)} contributions used and ${formatDuration(budget?.usedDurationSeconds)} used.`}
        accent={colors.flash}
        testID="home-quota"
      >
        <Text style={styles.kicker}>THIS CYCLE&apos;S QUOTA</Text>
        <Text style={styles.quotaActor}>{actorName} · FIVE SLOTS / THIRTY SECONDS</Text>
        <View style={styles.quotaRow}>
          <HomeMetric
            label="SLOTS USED"
            testID="home-quota-count"
            value={`${formatCount(budget?.usedCount)} / ${MAX_CONTRIBUTIONS_PER_MEMBER}`}
          />
          <HomeMetric
            label="SECONDS USED"
            testID="home-quota-duration"
            value={`${formatDuration(budget?.usedDurationSeconds)} / ${MAX_TOTAL_DURATION_SECONDS} SEC`}
          />
        </View>
        {cycle ? null : (
          <Text accessibilityRole="alert" style={styles.policyText} testID="home-policy-rejection">
            This local cycle is not accepting captures yet. The home remains metadata-only.
          </Text>
        )}
      </FrameCard>

      <FrameCard
        accessible={false}
        accessibilityLabel="Lock-safe group activity"
        accent={colors.acid}
        testID="home-activity"
      >
        <Text style={styles.kicker}>LOCKED ACTIVITY</Text>
        {contributions.length > 0 ? (
          <View style={styles.activityList}>
            {contributions.map((summary) => (
              <ActivityRow key={summary.id} members={members} summary={summary} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText} testID="home-empty-activity">
            NO LOCKED FRAMES YET · CAPTURE DETAILS STAY HIDDEN UNTIL REVEAL.
          </Text>
        )}
        <Text style={styles.disclosure}>PRE-REVEAL · METADATA ONLY · NO MEDIA PREVIEW</Text>
      </FrameCard>

      <InvitePreview groupName={group.name} />
    </View>
  );
}

function ActivityRow({
  members,
  summary,
}: {
  members: LocalHomeSnapshot['members'];
  summary: SafeContributionSummary;
}) {
  const mediaLabel = summary.mediaKind === 'photo' ? 'PHOTO' : 'VIDEO';
  const label = `${memberNameForSummary(members, summary)} · ${mediaLabel} · ${formatDuration(summary.durationSeconds)} SEC · ${summary.vignetteTreatment.toUpperCase()} · ${summary.state.toUpperCase()}`;

  return (
    <View accessible accessibilityLabel={label} style={styles.activityRow}>
      <View style={styles.activityMain}>
        <Text style={styles.activityMember}>{memberNameForSummary(members, summary)}</Text>
        <Text style={styles.activityMeta}>
          {mediaLabel} · {formatDuration(summary.durationSeconds)} SEC ·{' '}
          {summary.vignetteTreatment.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.activityState}>{summary.state.toUpperCase()}</Text>
    </View>
  );
}

function InvitePreview({ groupName }: { groupName: string }) {
  const [expanded, setExpanded] = useState(false);
  const actionLabel = expanded ? 'Hide local invite preview' : 'Show local invite preview';

  return (
    <FrameCard
      accessible={false}
      accessibilityLabel="Local invite preview"
      accent={colors.flash}
      testID="home-invite-card"
    >
      <Text style={styles.kicker}>INVITE PREVIEW</Text>
      <Text style={styles.inviteBody}>
        A local preview for {groupName}. Nothing is sent and no link is delivered in V1.
      </Text>
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}
        testID="home-invite-preview"
      >
        <Text style={styles.inviteButtonLabel}>
          {expanded ? 'HIDE PREVIEW' : 'PREVIEW LOCALLY'}
        </Text>
      </Pressable>
      {expanded ? (
        <View
          accessible
          accessibilityLabel={`Local invite preview for ${groupName}. Not delivered.`}
          style={styles.inviteSheet}
          testID="home-invite-preview-sheet"
        >
          <Text style={styles.inviteSheetLabel}>LOCAL INVITE PREVIEW</Text>
          <Text style={styles.inviteSheetName}>{groupName}</Text>
          <Text style={styles.inviteSheetNote}>NOT DELIVERED · NO NETWORK · NO DEEP LINK</Text>
        </View>
      ) : null}
    </FrameCard>
  );
}

function HomeMetric({ label, testID, value }: { label: string; testID: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.metric}
      testID={testID}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function cycleStatusLabel(status: CycleStatus | null): string {
  if (!status) {
    return 'NOT ACTIVE';
  }
  return status.replace('_', ' ').toUpperCase();
}

function formatCount(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

function formatDuration(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

const styles = StyleSheet.create({
  activityList: {
    gap: spacing.compact,
  },
  activityMain: {
    flex: 1,
    gap: spacing.micro,
  },
  activityMember: {
    ...typography.bodySmall,
    color: colors.paper,
    fontWeight: '700',
  },
  activityMeta: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1,
  },
  activityRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.compact,
    paddingBottom: spacing.compact,
  },
  activityState: {
    ...typography.utility,
    color: colors.acid,
    fontSize: 9,
  },
  cycleRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.section,
    marginTop: spacing.compact,
    paddingTop: spacing.compact,
  },
  disclosure: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: spacing.micro,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.flash,
  },
  groupName: {
    ...typography.title,
    color: colors.paper,
  },
  inviteBody: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  inviteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.flash,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.control,
  },
  inviteButtonLabel: {
    ...typography.utility,
    color: colors.flash,
  },
  inviteSheet: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing.micro,
    padding: spacing.inset,
  },
  inviteSheetLabel: {
    ...typography.utility,
    color: colors.acid,
  },
  inviteSheetName: {
    ...typography.body,
    color: colors.paper,
  },
  inviteSheetNote: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
  },
  kicker: {
    ...typography.label,
    color: colors.paper,
  },
  metric: {
    gap: spacing.micro,
    minWidth: 100,
  },
  metricLabel: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
  },
  metricValue: {
    ...typography.bodySmall,
    color: colors.paper,
    fontWeight: '700',
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.flash,
  },
  pressed: {
    opacity: 0.72,
  },
  prompt: {
    ...typography.body,
    color: colors.muted,
  },
  promptLabel: {
    ...typography.utility,
    color: colors.acid,
    fontSize: 9,
    marginTop: spacing.compact,
  },
  quotaActor: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
  },
  quotaRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.section,
    marginTop: spacing.compact,
    paddingTop: spacing.compact,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.flash,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.control,
  },
  retryLabel: {
    ...typography.utility,
    color: colors.flash,
  },
  stateBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing.compact,
    padding: spacing.inset,
  },
  stateBody: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  stateLabel: {
    ...typography.utility,
    color: colors.acid,
  },
  surface: {
    gap: spacing.section,
  },
});

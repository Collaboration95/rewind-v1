import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../../components/FrameCard';
import { colors, radii, spacing, typography } from '../../components/tokens';
import type {
  LocalContributionReview,
  LocalContributionReviewSnapshot,
  LocalContributionReviewStore,
} from './local-contribution-review-store';

export const PROCESSING_SIMULATION_DELAY_MS = 450;

type ContributionReviewPanelProps = {
  refreshToken?: number;
  store?: LocalContributionReviewStore;
};

type ReviewPhase = 'empty' | 'error' | 'locked' | 'loading' | 'processing' | 'review';
type PendingAction = 'completing' | 'discarding' | 'submitting' | null;

const actionError = 'The local contribution could not be updated. Try again.';

export function ContributionReviewPanel({
  refreshToken = 0,
  store: providedStore,
}: ContributionReviewPanelProps) {
  const [store, setStore] = useState<LocalContributionReviewStore | null>(providedStore ?? null);
  const [snapshot, setSnapshot] = useState<LocalContributionReviewSnapshot | null>(null);
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [retryToken, setRetryToken] = useState(0);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCompletionTimer();
    };
  }, [clearCompletionTimer]);

  useEffect(() => {
    let cancelled = false;
    clearCompletionTimer();

    const storePromise = providedStore
      ? Promise.resolve(providedStore)
      : import('./local-contribution-review-store').then(
          ({ createSqliteLocalContributionReviewStore }) =>
            createSqliteLocalContributionReviewStore(),
        );

    void storePromise
      .then((resolvedStore) => {
        if (cancelled) {
          return null;
        }
        setStore(resolvedStore);
        return resolvedStore.load();
      })
      .then((nextSnapshot) => {
        if (cancelled || !nextSnapshot) {
          return;
        }
        setSnapshot(nextSnapshot);
        setLoadError(null);
        setActionErrorMessage(null);
        setPendingAction(null);
        setPhase(phaseForReview(nextSnapshot.review));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSnapshot(null);
        setPendingAction(null);
        setLoadError('The local contribution review could not be restored. Try again.');
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [clearCompletionTimer, providedStore, refreshToken, retryToken]);

  const finishProcessing = useCallback(
    async (reviewStore: LocalContributionReviewStore, contributionId: string) => {
      completionTimerRef.current = null;
      setPendingAction('completing');
      setActionErrorMessage(null);
      setPhase('processing');
      try {
        const outcome = await reviewStore.completeProcessing(contributionId);
        if (!mountedRef.current) {
          return;
        }
        setPendingAction(null);
        setSnapshot((current) =>
          current && outcome.review ? { ...current, review: outcome.review } : current,
        );
        if (!outcome.accepted) {
          setActionErrorMessage(outcome.reason);
          setPhase(outcome.review?.state === 'processing' ? 'processing' : 'review');
          return;
        }
        setPhase('locked');
      } catch {
        if (!mountedRef.current) {
          return;
        }
        setPendingAction(null);
        setActionErrorMessage(actionError);
        setPhase('processing');
      }
    },
    [],
  );

  const submit = useCallback(async () => {
    const review = snapshot?.review;
    if (!store || !review || review.state !== 'captured' || pendingAction !== null) {
      return;
    }

    setPendingAction('submitting');
    setActionErrorMessage(null);
    setPhase('processing');
    try {
      const outcome = await store.startProcessing(review.id);
      if (!mountedRef.current) {
        return;
      }
      if (!outcome.accepted) {
        setPendingAction(null);
        setActionErrorMessage(outcome.reason);
        setSnapshot((current) =>
          current && outcome.review ? { ...current, review: outcome.review } : current,
        );
        setPhase('review');
        return;
      }

      setSnapshot((current) => (current ? { ...current, review: outcome.review } : current));
      setPendingAction(null);
      completionTimerRef.current = setTimeout(() => {
        void finishProcessing(store, review.id);
      }, PROCESSING_SIMULATION_DELAY_MS);
    } catch {
      if (!mountedRef.current) {
        return;
      }
      setPendingAction(null);
      setActionErrorMessage(actionError);
      setPhase('review');
    }
  }, [finishProcessing, pendingAction, snapshot, store]);

  const complete = useCallback(() => {
    const review = snapshot?.review;
    if (!store || !review || review.state !== 'processing' || pendingAction !== null) {
      return;
    }
    clearCompletionTimer();
    void finishProcessing(store, review.id);
  }, [clearCompletionTimer, finishProcessing, pendingAction, snapshot, store]);

  const discard = useCallback(async () => {
    const review = snapshot?.review;
    if (!store || !review || review.state !== 'captured' || pendingAction !== null) {
      return;
    }

    setPendingAction('discarding');
    setActionErrorMessage(null);
    try {
      await store.discard(review.id);
      if (!mountedRef.current) {
        return;
      }
      setPendingAction(null);
      setSnapshot((current) => (current ? { ...current, review: null } : current));
      setPhase('empty');
    } catch {
      if (!mountedRef.current) {
        return;
      }
      setPendingAction(null);
      setActionErrorMessage(actionError);
      setPhase('review');
    }
  }, [pendingAction, snapshot, store]);

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  return (
    <View style={styles.panel} testID="contribution-review-panel">
      {phase === 'loading' ? <LoadingState /> : null}
      {phase === 'error' ? <ErrorState message={loadError ?? actionError} onRetry={retry} /> : null}
      {phase === 'empty' ? <EmptyState /> : null}
      {snapshot?.review && phase !== 'loading' && phase !== 'error' && phase !== 'empty' ? (
        <ReviewCard
          actionErrorMessage={actionErrorMessage}
          onComplete={complete}
          onDiscard={discard}
          onSubmit={submit}
          pendingAction={pendingAction}
          phase={phase}
          review={snapshot.review}
        />
      ) : null}
    </View>
  );
}

function LoadingState() {
  return (
    <FrameCard
      accessible
      accessibilityLabel="Local contribution review is loading"
      accent={colors.flash}
      testID="review-loading"
    >
      <Text style={styles.kicker}>CAPTURE REVIEW</Text>
      <Text style={styles.stateCopy}>RESTORING LOCAL CAPTURE DETAILS…</Text>
    </FrameCard>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <FrameCard
      accessible={false}
      accessibilityLabel="Local contribution review needs attention"
      accent={colors.flash}
      testID="review-error-state"
    >
      <Text style={styles.kicker}>CAPTURE REVIEW</Text>
      <Text accessibilityRole="alert" style={styles.errorCopy} testID="review-error">
        {message}
      </Text>
      <ActionButton
        disabled={false}
        label="TRY REVIEW AGAIN"
        onPress={onRetry}
        secondary
        testID="review-retry"
      />
    </FrameCard>
  );
}

function EmptyState() {
  return (
    <FrameCard
      accessible
      accessibilityLabel="No local capture is waiting for review"
      accent={colors.flash}
      testID="review-empty"
    >
      <Text style={styles.kicker}>CAPTURE REVIEW</Text>
      <Text style={styles.stateTitle}>NO CAPTURE WAITING</Text>
      <Text style={styles.stateCopy}>
        Save a local photo or short video above and it will appear here before submission.
      </Text>
      <Text style={styles.disclosure}>NO PREVIEW · NO NETWORK · LOCAL STATE ONLY</Text>
    </FrameCard>
  );
}

function ReviewCard({
  actionErrorMessage,
  onComplete,
  onDiscard,
  onSubmit,
  pendingAction,
  phase,
  review,
}: {
  actionErrorMessage: string | null;
  onComplete: () => void;
  onDiscard: () => void;
  onSubmit: () => void;
  pendingAction: PendingAction;
  phase: ReviewPhase;
  review: LocalContributionReview;
}) {
  const mediaLabel = review.mediaKind === 'photo' ? 'PHOTO' : 'VIDEO';
  const statusLabel = reviewStatusLabel(phase, review.state);
  const statusDescription = `${mediaLabel} capture review, ${statusLabel}. Media remains hidden until reveal.`;
  const canSubmit = review.state === 'captured' && phase === 'review';
  const canDiscard = review.state === 'captured' && phase === 'review';

  return (
    <FrameCard
      accessible={false}
      accessibilityLabel={statusDescription}
      accent={phase === 'locked' ? colors.acid : colors.flash}
      testID="review-card"
    >
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>CAPTURE REVIEW</Text>
        <Text style={styles.mode}>{mediaLabel} · LOCAL</Text>
      </View>

      <View
        accessible
        accessibilityLabel={`Contribution status: ${statusLabel}`}
        style={styles.statusBlock}
        testID="review-status"
      >
        <Text
          style={[styles.phase, phase === 'locked' && styles.phaseLocked]}
          testID="review-state"
        >
          {statusLabel}
        </Text>
        <Text style={styles.stateTitle} testID="review-media-kind">
          {mediaLabel} CAPTURE
        </Text>
      </View>

      <View style={styles.details}>
        <ReviewDetail
          label="DURATION"
          testID="review-duration"
          value={`${formatDuration(review.durationSeconds)} ${review.mediaKind === 'photo' ? 'DISPLAY' : 'RECORDED'}`}
        />
        <ReviewDetail
          label="VIGNETTE"
          testID="review-preset"
          value={review.vignetteTreatment.toUpperCase()}
        />
        <ReviewDetail
          label="LOCAL FILE"
          testID="review-file-status"
          value={review.fileStatus === 'stored' ? 'STORED ON THIS DEVICE' : 'NOT AVAILABLE'}
        />
      </View>

      <Text style={styles.disclosure}>
        METADATA ONLY · NO IMAGE, VIDEO, THUMBNAIL, OR URI PREVIEW BEFORE REVEAL
      </Text>

      {actionErrorMessage ? (
        <Text accessibilityRole="alert" style={styles.errorCopy} testID="review-rejection">
          {actionErrorMessage}
        </Text>
      ) : null}

      {phase === 'locked' ? (
        <Text style={styles.lockedCopy} testID="review-locked-note">
          LOCKED LOCALLY · HELD UNTIL THE GROUP REVEAL.
        </Text>
      ) : phase === 'processing' ? (
        <ActionButton
          disabled={pendingAction !== null}
          label={
            pendingAction === 'submitting'
              ? 'SUBMITTING…'
              : pendingAction === 'completing'
                ? 'FINISHING…'
                : 'FINISH LOCAL PROCESSING'
          }
          onPress={onComplete}
          testID="review-complete-processing"
        />
      ) : review.state === 'failed' ? (
        <Text style={styles.errorCopy} testID="review-processing-delayed">
          PROCESSING DID NOT FINISH. RETRY CONTROLS ARRIVE IN THE NEXT LIFECYCLE SLICE.
        </Text>
      ) : (
        <View style={styles.actionStack}>
          <ActionButton
            disabled={!canSubmit || pendingAction !== null}
            label={pendingAction === 'submitting' ? 'SUBMITTING…' : 'SUBMIT AND LOCK'}
            onPress={onSubmit}
            testID="review-submit"
          />
          <ActionButton
            disabled={!canDiscard || pendingAction !== null}
            label={pendingAction === 'discarding' ? 'DISCARDING…' : 'DISCARD CAPTURE'}
            onPress={onDiscard}
            secondary
            testID="review-discard"
          />
        </View>
      )}
    </FrameCard>
  );
}

function ReviewDetail({ label, testID, value }: { label: string; testID: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.detail}
      testID={testID}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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

function phaseForReview(review: LocalContributionReview | null): ReviewPhase {
  if (!review) {
    return 'empty';
  }
  if (review.state === 'locked') {
    return 'locked';
  }
  if (review.state === 'processing') {
    return 'processing';
  }
  return 'review';
}

function reviewStatusLabel(phase: ReviewPhase, state: LocalContributionReview['state']): string {
  if (phase === 'locked' || state === 'locked') {
    return 'LOCKED UNTIL REVEAL';
  }
  if (phase === 'processing' || state === 'processing') {
    return 'PROCESSING LOCALLY';
  }
  if (state === 'failed') {
    return 'PROCESSING DELAYED';
  }
  return 'READY TO SUBMIT';
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `00:${String(safeSeconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.control,
    width: '100%',
  },
  actionButtonPrimary: {
    backgroundColor: colors.acid,
    borderColor: colors.acid,
    borderWidth: 1,
  },
  actionButtonSecondary: {
    borderColor: colors.paper,
    borderWidth: 1,
  },
  actionLabelPrimary: {
    ...typography.utility,
    color: colors.ink,
  },
  actionLabelSecondary: {
    ...typography.utility,
    color: colors.paper,
  },
  actionStack: {
    gap: spacing.compact,
  },
  detail: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flex: 1,
    gap: spacing.micro,
    paddingBottom: spacing.compact,
  },
  detailLabel: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.paper,
    fontWeight: '700',
  },
  details: {
    flexDirection: 'row',
    gap: spacing.compact,
  },
  disabled: {
    opacity: 0.5,
  },
  disclosure: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  errorCopy: {
    ...typography.bodySmall,
    color: colors.flash,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    ...typography.label,
    color: colors.paper,
  },
  lockedCopy: {
    ...typography.utility,
    color: colors.acid,
    fontSize: 10,
  },
  mode: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 10,
  },
  panel: {
    gap: spacing.compact,
  },
  phase: {
    ...typography.utility,
    color: colors.flash,
  },
  phaseLocked: {
    color: colors.acid,
  },
  pressed: {
    opacity: 0.72,
  },
  stateBlock: {
    gap: spacing.micro,
  },
  stateCopy: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  stateTitle: {
    ...typography.title,
    color: colors.paper,
    fontSize: 24,
    lineHeight: 28,
  },
  statusBlock: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.micro,
    paddingBottom: spacing.inset,
  },
});

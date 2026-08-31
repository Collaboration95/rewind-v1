import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { seededCycle } from '../../../packages/domain/src/fixtures';
import type { AuditEvent } from '../../../packages/domain/src/models';
import {
  PROCESSING_SIMULATION_DELAY_MS,
  ContributionReviewPanel,
  type ProcessingSimulationPort,
} from '../features/capture/ContributionReviewPanel';
import type {
  LocalContributionReview,
  LocalContributionReviewOutcome,
  LocalContributionReviewStore,
} from '../features/capture/local-contribution-review-store';
import type { HapticsPort } from '../platform/haptics/feedback';

afterEach(() => {
  jest.useRealTimers();
});

function createReview(overrides: Partial<LocalContributionReview> = {}): LocalContributionReview {
  return {
    capturedAt: '2026-08-30T10:30:00.000Z',
    durationSeconds: 5,
    fileStatus: 'stored',
    id: 'contribution-review-ui',
    mediaKind: 'video',
    processingAttempt: 0,
    state: 'captured',
    vignetteTreatment: 'flash',
    ...overrides,
  };
}

function auditEvent(id: string, type: string): AuditEvent {
  return {
    at: '2026-08-30T11:00:00.000Z',
    id,
    metadata: { action: type.replace('policy.', ''), idempotent: false },
    subjectId: 'contribution-review-ui',
    type,
  };
}

function accepted(review: LocalContributionReview, action: string): LocalContributionReviewOutcome {
  return {
    accepted: true,
    auditEvent: auditEvent(`audit-${action}`, `policy.${action}`),
    idempotent: false,
    review,
  };
}

function createStore({
  initialReview = createReview(),
  rejectSubmission = false,
}: {
  initialReview?: LocalContributionReview;
  rejectSubmission?: boolean;
} = {}) {
  let currentReview: LocalContributionReview | null = initialReview;
  const store: LocalContributionReviewStore = {
    completeProcessing: jest.fn(async () => {
      currentReview = { ...currentReview!, state: 'locked' };
      return accepted(currentReview, 'processing.completed');
    }),
    deleteContribution: jest.fn(async () => {
      currentReview = null;
      return accepted(
        createReview({ fileStatus: 'missing', state: 'deleted' }),
        'contribution.deleted',
      );
    }),
    discard: jest.fn(async () => {
      currentReview = null;
    }),
    failProcessing: jest.fn(async () => {
      currentReview = { ...currentReview!, state: 'failed' };
      return accepted(currentReview, 'processing.failed');
    }),
    load: jest.fn(async () => ({ cycle: seededCycle, review: currentReview })),
    startProcessing: jest.fn(async (): Promise<LocalContributionReviewOutcome> => {
      if (rejectSubmission) {
        return {
          accepted: false,
          auditEvent: auditEvent('audit-rejected', 'policy.rejected'),
          code: 'duration-budget-limit',
          reason: 'That contribution would exceed the 30-second cycle allowance.',
          review: currentReview,
        };
      }
      currentReview = { ...currentReview!, processingAttempt: 1, state: 'processing' };
      return accepted(currentReview, 'processing.started');
    }),
    retryProcessing: jest.fn(async (): Promise<LocalContributionReviewOutcome> => {
      currentReview = { ...currentReview!, processingAttempt: 2, state: 'processing' };
      return accepted(currentReview, 'processing.retried');
    }),
  };
  return { store, getReview: () => currentReview };
}

describe('Contribution review and local lock flow', () => {
  it('shows metadata-only review, traverses processing, and reaches locked state', async () => {
    jest.useFakeTimers();
    const { store } = createStore();
    const haptics: HapticsPort = {
      trigger: jest.fn(async () => undefined),
    };
    const view = await render(<ContributionReviewPanel haptics={haptics} store={store} />);

    await waitFor(() => expect(view.getByTestId('review-submit')).toBeTruthy());
    expect(view.getByTestId('review-duration')).toHaveTextContent(/00:05 RECORDED/);
    expect(view.getByTestId('review-file-status')).toHaveTextContent(/STORED ON THIS DEVICE/);
    expect(
      view.queryByText('file:///documents/rewind-captures/contribution-review-ui.mov'),
    ).toBeNull();

    await act(async () => {
      fireEvent.press(view.getByTestId('review-submit'));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.getByTestId('review-state')).toHaveTextContent('PROCESSING LOCALLY'),
    );
    expect(store.startProcessing).toHaveBeenCalledWith('contribution-review-ui');

    await act(async () => {
      jest.advanceTimersByTime(PROCESSING_SIMULATION_DELAY_MS);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.getByTestId('review-state')).toHaveTextContent('LOCKED UNTIL REVEAL'),
    );
    expect(view.getByTestId('review-locked-note')).toBeTruthy();
    expect(view.queryByTestId('review-submit')).toBeNull();
    expect(view.queryByTestId('review-complete-processing')).toBeNull();
    expect(store.completeProcessing).toHaveBeenCalledWith('contribution-review-ui');
    expect(haptics.trigger).toHaveBeenCalledWith('locked');
  });

  it('keeps an invalid submission visible with a safe rejection before lock', async () => {
    const { store } = createStore({ rejectSubmission: true });
    const view = await render(<ContributionReviewPanel store={store} />);

    await waitFor(() => expect(view.getByTestId('review-submit')).toBeTruthy());
    await fireEvent.press(view.getByTestId('review-submit'));

    await waitFor(() =>
      expect(view.getByTestId('review-rejection')).toHaveTextContent(
        'That contribution would exceed the 30-second cycle allowance.',
      ),
    );
    expect(view.getByTestId('review-state')).toHaveTextContent('READY TO SUBMIT');
    expect(view.queryByTestId('review-locked-note')).toBeNull();
    expect(store.completeProcessing).not.toHaveBeenCalled();
  });

  it('provides a clear discard action and restores the empty review state', async () => {
    const { store, getReview } = createStore();
    const view = await render(<ContributionReviewPanel store={store} />);

    await waitFor(() => expect(view.getByTestId('review-discard')).toBeTruthy());
    await fireEvent.press(view.getByTestId('review-discard'));

    await waitFor(() => expect(view.getByTestId('review-empty')).toBeTruthy());
    expect(getReview()).toBeNull();
    expect(store.discard).toHaveBeenCalledWith('contribution-review-ui');
  });

  it('restores a locked state without exposing playback or a media locator', async () => {
    const { store } = createStore({
      initialReview: createReview({ processingAttempt: 1, state: 'locked' }),
    });
    const view = await render(<ContributionReviewPanel store={store} />);

    await waitFor(() => expect(view.getByTestId('review-locked-note')).toBeTruthy());
    expect(view.queryByTestId('review-submit')).toBeNull();
    expect(view.queryByTestId('review-discard')).toBeNull();
    expect(
      view.queryByText('file:///documents/rewind-captures/contribution-review-ui.mov'),
    ).toBeNull();
  });

  it('requires an inline confirmation before deleting a locked local contribution', async () => {
    const { store, getReview } = createStore({
      initialReview: createReview({ processingAttempt: 1, state: 'locked' }),
    });
    const view = await render(<ContributionReviewPanel store={store} />);

    await waitFor(() => expect(view.getByTestId('review-delete')).toBeTruthy());
    await fireEvent.press(view.getByTestId('review-delete'));
    expect(view.getByTestId('review-delete-confirmation')).toHaveTextContent(
      /This uses the one deletion allowed in the simulated week\./,
    );
    expect(store.deleteContribution).not.toHaveBeenCalled();

    await fireEvent.press(view.getByTestId('review-delete-confirm'));
    await waitFor(() => expect(view.getByTestId('review-empty')).toBeTruthy());
    expect(store.deleteContribution).toHaveBeenCalledWith('contribution-review-ui');
    expect(getReview()).toBeNull();
  });

  it('shows a safe processing failure and retries once without exposing media', async () => {
    jest.useFakeTimers();
    const { store } = createStore();
    const processingSimulation: ProcessingSimulationPort = {
      shouldFail: jest.fn((review: LocalContributionReview) => review.processingAttempt === 1),
    };
    const view = await render(
      <ContributionReviewPanel processingSimulation={processingSimulation} store={store} />,
    );

    await waitFor(() => expect(view.getByTestId('review-submit')).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByTestId('review-submit'));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.getByTestId('review-state')).toHaveTextContent('PROCESSING LOCALLY'),
    );
    await act(async () => {
      jest.advanceTimersByTime(PROCESSING_SIMULATION_DELAY_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId('review-processing-delayed')).toBeTruthy());
    expect(view.getByTestId('review-retry-processing')).toBeTruthy();
    expect(store.failProcessing).toHaveBeenCalledWith('contribution-review-ui');
    expect(view.queryByText(/file:\/\/\/documents/)).toBeNull();

    await act(async () => {
      fireEvent.press(view.getByTestId('review-retry-processing'));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.getByTestId('review-state')).toHaveTextContent('PROCESSING LOCALLY'),
    );
    await act(async () => {
      jest.advanceTimersByTime(PROCESSING_SIMULATION_DELAY_MS);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.getByTestId('review-state')).toHaveTextContent('LOCKED UNTIL REVEAL'),
    );
    expect(store.retryProcessing).toHaveBeenCalledWith('contribution-review-ui');
    expect(store.completeProcessing).toHaveBeenCalledWith('contribution-review-ui');
  });
});

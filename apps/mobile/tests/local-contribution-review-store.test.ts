import { describe, expect, it, jest } from '@jest/globals';

import { getContributionBudget } from '../../../packages/domain/src/policy';
import {
  seededContributions,
  seededCycle,
  seededGroup,
} from '../../../packages/domain/src/fixtures';
import type { AuditEvent, Contribution } from '../../../packages/domain/src/models';
import type { LocalMediaFilePort } from '../platform/files/storage';
import {
  createLocalContributionReviewStore,
  type LocalContributionReviewRepository,
} from '../features/capture/local-contribution-review-store';

function createContribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    capturedAt: '2026-08-30T10:30:00.000Z',
    cycleId: seededCycle.id,
    deletedAt: null,
    durationSeconds: 5,
    id: 'contribution-review-video',
    localUri: 'file:///documents/rewind-captures/contribution-review-video.mov',
    mediaKind: 'video',
    memberId: 'member-ava',
    processingAttempt: 0,
    state: 'captured',
    vignetteTreatment: 'flash',
    ...overrides,
  };
}

function createHarness(
  candidate: Contribution = createContribution(),
  extraContributions: readonly Contribution[] = [],
) {
  const records = [...seededContributions, candidate, ...extraContributions];
  const auditEvents: AuditEvent[] = [];
  const files: LocalMediaFilePort = {
    copyFromCache: jest.fn(async (_sourceUri, destinationName) => ({
      uri: `file:///documents/rewind-captures/${destinationName}`,
    })),
    exists: jest.fn(async () => true),
    remove: jest.fn(async () => undefined),
  };
  const repository: LocalContributionReviewRepository = {
    audit: {
      append: jest.fn(async (event: AuditEvent) => {
        auditEvents.push(event);
      }),
      list: jest.fn(async () => auditEvents),
    },
    contributions: {
      get: jest.fn(
        async (contributionId: string) => records.find(({ id }) => id === contributionId) ?? null,
      ),
      listByCycle: jest.fn(async () => records.filter(({ cycleId }) => cycleId === seededCycle.id)),
      remove: jest.fn(async (contributionId: string) => {
        const index = records.findIndex(({ id }) => id === contributionId);
        if (index >= 0) {
          records.splice(index, 1);
        }
      }),
      save: jest.fn(async (contribution: Contribution) => {
        const index = records.findIndex(({ id }) => id === contribution.id);
        if (index >= 0) {
          records[index] = contribution;
        } else {
          records.push(contribution);
        }
      }),
    },
    cycles: {
      get: jest.fn(async () => seededCycle),
      getCollecting: jest.fn(async () => seededCycle),
    },
    groups: {
      get: jest.fn(async () => seededGroup),
    },
    session: {
      getActiveMemberId: jest.fn(async () => 'member-ava'),
    },
  };
  const store = createLocalContributionReviewStore({
    files,
    nextAuditId: (action, contributionId) => `test-${action}-${contributionId}`,
    now: () => '2026-08-30T11:00:00.000Z',
    repository,
  });

  return { auditEvents, files, records, repository, store };
}

describe('Local contribution review store', () => {
  it('loads a safe photo/video-neutral review and persists processing to lock', async () => {
    const candidate = createContribution({
      durationSeconds: 3,
      id: 'contribution-review-photo',
      localUri: 'file:///documents/rewind-captures/contribution-review-photo.jpg',
      mediaKind: 'photo',
    });
    const { auditEvents, records, repository, store } = createHarness(candidate);

    const initial = await store.load();
    expect(initial.review).toMatchObject({
      durationSeconds: 3,
      fileStatus: 'stored',
      id: 'contribution-review-photo',
      mediaKind: 'photo',
      state: 'captured',
    });
    expect(initial.review).not.toHaveProperty('localUri');

    const processing = await store.startProcessing('contribution-review-photo');
    expect(processing).toMatchObject({ accepted: true, review: { state: 'processing' } });
    expect(repository.contributions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'contribution-review-photo',
        processingAttempt: 1,
        state: 'processing',
      }),
    );

    const locked = await store.completeProcessing('contribution-review-photo');
    expect(locked).toMatchObject({ accepted: true, review: { state: 'locked' } });
    expect(auditEvents.map(({ type }) => type)).toEqual([
      'policy.submission.validated',
      'policy.processing.started',
      'policy.processing.completed',
    ]);
    expect(records.find(({ id }) => id === 'contribution-review-photo')?.state).toBe('locked');
    expect(getContributionBudget(records, 'member-ava', seededCycle.id)).toMatchObject({
      usedCount: 2,
      usedDurationSeconds: 6,
    });

    const relaunched = createLocalContributionReviewStore({
      files: createHarness().files,
      nextAuditId: (action, contributionId) => `relaunch-${action}-${contributionId}`,
      now: () => '2026-08-30T12:00:00.000Z',
      repository,
    });
    expect((await relaunched.load()).review).toMatchObject({
      id: 'contribution-review-photo',
      state: 'locked',
    });
  });

  it('rejects an over-budget persisted capture before processing or lock', async () => {
    const candidate = createContribution({ durationSeconds: 4 });
    const { auditEvents, repository, store } = createHarness(candidate, [
      createContribution({ durationSeconds: 15, id: 'contribution-review-fifteen' }),
      createContribution({ durationSeconds: 12, id: 'contribution-review-twelve' }),
    ]);

    const outcome = await store.startProcessing(candidate.id);

    expect(outcome).toMatchObject({
      accepted: false,
      code: 'duration-budget-limit',
      reason: 'That contribution would exceed the 30-second cycle allowance.',
      review: { state: 'captured' },
    });
    expect(repository.contributions.save).not.toHaveBeenCalled();
    expect(auditEvents.at(-1)?.type).toBe('policy.rejected');
  });

  it('discards a captured local file and removes its metadata before submission', async () => {
    const candidate = createContribution({ id: 'contribution-review-discard' });
    const { auditEvents, files, records, repository, store } = createHarness(candidate);

    await store.discard(candidate.id);

    expect(files.remove).toHaveBeenCalledWith(candidate.localUri);
    expect(repository.contributions.remove).toHaveBeenCalledWith(candidate.id);
    expect(records.some(({ id }) => id === candidate.id)).toBe(false);
    expect(auditEvents.at(-1)).toMatchObject({
      subjectId: candidate.id,
      type: 'local.review.discarded',
    });
  });

  it('deletes one locked local contribution, dereferences its file, and restores the quota', async () => {
    const candidate = createContribution({ id: 'contribution-review-delete', state: 'locked' });
    const { auditEvents, files, records, store } = createHarness(candidate);

    const outcome = await store.deleteContribution(candidate.id);

    expect(outcome).toMatchObject({
      accepted: true,
      review: { fileStatus: 'missing', state: 'deleted' },
    });
    expect(files.remove).toHaveBeenCalledWith(candidate.localUri);
    expect(records.find(({ id }) => id === candidate.id)).toMatchObject({
      deletedAt: '2026-08-30T11:00:00.000Z',
      localUri: null,
      state: 'deleted',
    });
    expect(getContributionBudget(records, 'member-ava', seededCycle.id)).toMatchObject({
      usedCount: 1,
      usedDurationSeconds: 3,
    });
    expect(auditEvents.at(-1)).toMatchObject({ type: 'policy.contribution.deleted' });
  });

  it('refuses a second same-week delete without altering its file, contribution, or quota', async () => {
    const candidate = createContribution({
      id: 'contribution-review-second-delete',
      state: 'locked',
    });
    const { auditEvents, files, records, repository, store } = createHarness(candidate);

    await store.deleteContribution(candidate.id);
    const remaining = createContribution({
      durationSeconds: 8,
      id: 'contribution-review-delete-refused',
      state: 'locked',
    });
    records.push(remaining);
    const beforeBudget = getContributionBudget(records, 'member-ava', seededCycle.id);

    const outcome = await store.deleteContribution(remaining.id);

    expect(outcome).toMatchObject({
      accepted: false,
      code: 'delete-limit-reached',
      review: { id: remaining.id, state: 'locked' },
    });
    expect(files.remove).toHaveBeenCalledTimes(1);
    expect(repository.contributions.save).toHaveBeenCalledTimes(1);
    expect(records.find(({ id }) => id === remaining.id)).toEqual(remaining);
    expect(getContributionBudget(records, 'member-ava', seededCycle.id)).toEqual(beforeBudget);
    expect(auditEvents.at(-1)).toMatchObject({ type: 'policy.rejected' });
  });

  it('marks a processing failure and retries once without duplicating the contribution', async () => {
    const candidate = createContribution({
      id: 'contribution-review-retry',
      processingAttempt: 1,
      state: 'processing',
    });
    const { auditEvents, records, store } = createHarness(candidate);

    const failed = await store.failProcessing(candidate.id);
    expect(failed).toMatchObject({
      accepted: true,
      review: { processingAttempt: 1, state: 'failed' },
    });
    const retried = await store.retryProcessing(candidate.id);
    expect(retried).toMatchObject({
      accepted: true,
      review: { processingAttempt: 2, state: 'processing' },
    });
    const completed = await store.completeProcessing(candidate.id);

    expect(completed).toMatchObject({
      accepted: true,
      review: { processingAttempt: 2, state: 'locked' },
    });
    expect(records.filter(({ id }) => id === candidate.id)).toHaveLength(1);
    expect(auditEvents.map(({ type }) => type)).toEqual([
      'policy.processing.failed',
      'policy.processing.retried',
      'policy.processing.completed',
    ]);
  });

  it('preserves the stored contribution if removing its local file fails during deletion', async () => {
    const candidate = createContribution({
      id: 'contribution-review-delete-file-error',
      state: 'locked',
    });
    const { files, records, repository, store } = createHarness(candidate);
    jest.spyOn(files, 'remove').mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(store.deleteContribution(candidate.id)).rejects.toThrow('storage unavailable');

    expect(repository.contributions.save).not.toHaveBeenCalled();
    expect(records.find(({ id }) => id === candidate.id)).toEqual(candidate);
  });
});

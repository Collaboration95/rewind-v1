import {
  completeProcessing,
  startProcessing,
  validateContributionForSubmission,
  type PolicyRejected,
  type PolicyOutcome,
} from '../../../../packages/domain/src/policy/index.ts';
import { seededCycle } from '../../../../packages/domain/src/fixtures.ts';
import type {
  AuditEvent,
  AuditEventId,
  Contribution,
  ContributionId,
  Cycle,
  Group,
  IsoTimestamp,
  MemberId,
  SafeContributionSummary,
} from '../../../../packages/domain/src/models.ts';
import type {
  AuditRepositoryPort,
  ContributionRepositoryPort,
  CycleRepositoryPort,
  GroupRepositoryPort,
  SessionRepositoryPort,
} from '../../../../packages/domain/src/ports.ts';

import { DEMO_GROUP_ID } from '../session/session.ts';
import type { LocalMediaFilePort } from '../../platform/files/storage.ts';

export type LocalReviewFileStatus = 'missing' | 'stored';

/** A review view model that intentionally omits every media locator. */
export interface LocalContributionReview {
  readonly capturedAt: IsoTimestamp;
  readonly durationSeconds: number;
  readonly fileStatus: LocalReviewFileStatus;
  readonly id: ContributionId;
  readonly mediaKind: SafeContributionSummary['mediaKind'];
  readonly processingAttempt: number;
  readonly state: SafeContributionSummary['state'];
  readonly vignetteTreatment: SafeContributionSummary['vignetteTreatment'];
}

export interface LocalContributionReviewSnapshot {
  readonly cycle: Cycle | null;
  readonly review: LocalContributionReview | null;
}

export type LocalContributionReviewOutcome =
  | {
      readonly accepted: true;
      readonly auditEvent: AuditEvent;
      readonly idempotent: boolean;
      readonly review: LocalContributionReview;
    }
  | {
      readonly accepted: false;
      readonly auditEvent: AuditEvent;
      readonly code: PolicyRejected['code'];
      readonly reason: string;
      readonly review: LocalContributionReview | null;
    };

export interface LocalContributionReviewStore {
  discard(contributionId: ContributionId): Promise<void>;
  completeProcessing(contributionId: ContributionId): Promise<LocalContributionReviewOutcome>;
  load(): Promise<LocalContributionReviewSnapshot>;
  startProcessing(contributionId: ContributionId): Promise<LocalContributionReviewOutcome>;
}

export interface LocalContributionReviewRepository {
  readonly audit: Pick<AuditRepositoryPort, 'append'>;
  readonly contributions: Pick<
    ContributionRepositoryPort,
    'get' | 'listByCycle' | 'remove' | 'save'
  >;
  readonly cycles: Pick<CycleRepositoryPort, 'get' | 'getCollecting'>;
  readonly groups: Pick<GroupRepositoryPort, 'get'>;
  readonly session: Pick<SessionRepositoryPort, 'getActiveMemberId'>;
}

export interface LocalContributionReviewStoreOptions {
  readonly files: LocalMediaFilePort;
  readonly nextAuditId?: (action: string, contributionId: ContributionId) => AuditEventId;
  readonly now?: () => IsoTimestamp;
  readonly repository: LocalContributionReviewRepository;
}

export function createLocalContributionReviewStore({
  files,
  nextAuditId,
  now = () => new Date().toISOString(),
  repository,
}: LocalContributionReviewStoreOptions): LocalContributionReviewStore {
  let auditSequence = 0;
  const createAuditId =
    nextAuditId ??
    ((action: string, contributionId: ContributionId) =>
      `review-${action}-${contributionId}-${++auditSequence}`);

  return {
    async discard(contributionId) {
      const { contribution } = await getContributionContext(repository, contributionId, now);
      if (contribution.state !== 'captured') {
        throw new Error('Only a captured contribution can be discarded from review.');
      }

      if (contribution.localUri) {
        await files.remove(contribution.localUri);
      }
      await repository.contributions.remove(contribution.id);
      await repository.audit.append({
        at: now(),
        id: createAuditId('discarded', contribution.id),
        metadata: {
          action: 'review.discarded',
          durationSeconds: contribution.durationSeconds,
          mediaKind: contribution.mediaKind,
        },
        subjectId: contribution.id,
        type: 'local.review.discarded',
      });
    },

    async completeProcessing(contributionId) {
      const context = await getContributionContext(repository, contributionId, now);
      assertActiveReviewContribution(context, context.contribution);
      const { contribution } = context;

      const outcome = completeProcessing({
        contribution,
        context: {
          at: now(),
          auditEventId: createAuditId('processing-completed', contribution.id),
        },
      });
      if (!outcome.accepted) {
        await repository.audit.append(outcome.auditEvent);
        return toReviewOutcome(outcome, contribution);
      }

      await repository.contributions.save(outcome.value);
      await repository.audit.append(outcome.auditEvent);
      return toReviewOutcome(outcome, outcome.value);
    },

    async load() {
      const context = await getReviewContext(repository, now);
      if (!context.cycle || !context.activeMemberId) {
        return { cycle: context.cycle, review: null };
      }

      const contributions = await repository.contributions.listByCycle(context.cycle.id);
      const contribution = latestReviewableContribution(contributions, context.activeMemberId);
      return {
        cycle: context.cycle,
        review: contribution ? toReview(contribution) : null,
      };
    },

    async startProcessing(contributionId) {
      const { activeMemberId, contribution, cycle, group } = await getContributionContext(
        repository,
        contributionId,
        now,
      );
      if (!cycle) {
        throw new Error('The local contribution cycle could not be restored.');
      }
      if (!activeMemberId) {
        throw new Error('The local contribution actor could not be restored.');
      }

      const existingContributions = await repository.contributions.listByCycle(cycle.id);
      const validation = validateContributionForSubmission({
        actorMemberId: activeMemberId,
        context: {
          at: now(),
          auditEventId: createAuditId('submission-validated', contribution.id),
        },
        contribution,
        cycle,
        existingContributions,
        group,
      });
      await repository.audit.append(validation.auditEvent);
      if (!validation.accepted) {
        return toReviewOutcome(validation, contribution);
      }

      const outcome = startProcessing({
        contribution: validation.value,
        context: {
          at: now(),
          auditEventId: createAuditId('processing-started', contribution.id),
        },
      });
      if (!outcome.accepted) {
        await repository.audit.append(outcome.auditEvent);
        return toReviewOutcome(outcome, contribution);
      }

      await repository.contributions.save(outcome.value);
      await repository.audit.append(outcome.auditEvent);
      return toReviewOutcome(outcome, outcome.value);
    },
  };
}

export async function createSqliteLocalContributionReviewStore(
  providedFiles?: LocalMediaFilePort,
): Promise<LocalContributionReviewStore> {
  const files =
    providedFiles ??
    (await import('../../platform/files/expo-file-storage.ts')).createExpoLocalMediaFilePort();
  const { openLocalDatabase } = await import('../../data/local/database.ts');
  const database = await openLocalDatabase();
  return createLocalContributionReviewStore({
    files,
    repository: database.repository,
  });
}

interface LocalReviewContext {
  readonly activeMemberId: MemberId | null;
  readonly cycle: Cycle | null;
  readonly group: Group;
}

async function getReviewContext(
  repository: LocalContributionReviewRepository,
  now: () => IsoTimestamp,
): Promise<LocalReviewContext> {
  const group = await repository.groups.get(DEMO_GROUP_ID);
  if (!group) {
    throw new Error('The local demo group could not be restored.');
  }

  const at = now();
  const [activeMemberId, collectingCycle] = await Promise.all([
    repository.session.getActiveMemberId(group.id),
    repository.cycles.getCollecting(group.id, at),
  ]);
  return {
    activeMemberId,
    cycle: collectingCycle ?? (await repository.cycles.get(seededCycle.id)),
    group,
  };
}

async function getContributionContext(
  repository: LocalContributionReviewRepository,
  contributionId: ContributionId,
  now: () => IsoTimestamp,
): Promise<LocalReviewContext & { contribution: Contribution }> {
  const context = await getReviewContext(repository, now);
  const contribution = await repository.contributions.get(contributionId);
  if (!contribution) {
    throw new Error('The local contribution could not be restored.');
  }
  return { ...context, contribution };
}

function assertActiveReviewContribution(
  context: LocalReviewContext,
  contribution: Contribution,
): asserts context is LocalReviewContext & { activeMemberId: MemberId; cycle: Cycle } {
  if (
    !context.activeMemberId ||
    !context.cycle ||
    context.cycle.groupId !== context.group.id ||
    contribution.cycleId !== context.cycle.id ||
    contribution.memberId !== context.activeMemberId
  ) {
    throw new Error('The local contribution is outside the active group review.');
  }
}

function latestReviewableContribution(
  contributions: readonly Contribution[],
  activeMemberId: MemberId,
): Contribution | null {
  return (
    contributions
      .filter(
        (contribution) =>
          contribution.memberId === activeMemberId &&
          (contribution.state === 'captured' ||
            contribution.state === 'processing' ||
            contribution.state === 'failed' ||
            contribution.state === 'locked'),
      )
      .sort((left, right) =>
        left.capturedAt === right.capturedAt
          ? right.id.localeCompare(left.id)
          : right.capturedAt.localeCompare(left.capturedAt),
      )[0] ?? null
  );
}

function toReview(contribution: Contribution): LocalContributionReview {
  return {
    capturedAt: contribution.capturedAt,
    durationSeconds: contribution.durationSeconds,
    fileStatus:
      contribution.localUri && contribution.localUri.trim().length > 0 ? 'stored' : 'missing',
    id: contribution.id,
    mediaKind: contribution.mediaKind,
    processingAttempt: contribution.processingAttempt,
    state: contribution.state,
    vignetteTreatment: contribution.vignetteTreatment,
  };
}

function toReviewOutcome<T extends Contribution>(
  outcome: PolicyOutcome<T>,
  fallbackContribution: Contribution,
): LocalContributionReviewOutcome {
  if (!outcome.accepted) {
    return {
      accepted: false,
      auditEvent: outcome.auditEvent,
      code: outcome.code,
      reason: outcome.reason,
      review: toReview(fallbackContribution),
    };
  }

  return {
    accepted: true,
    auditEvent: outcome.auditEvent,
    idempotent: outcome.idempotent,
    review: toReview(outcome.value),
  };
}

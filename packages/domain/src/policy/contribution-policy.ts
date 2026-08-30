import type {
  AuditEvent,
  AuditEventId,
  Contribution,
  ContributionId,
  Cycle,
  CycleId,
  Group,
  IsoTimestamp,
  MediaKind,
  MemberId,
  SafeContributionSummary,
  VignetteTreatment,
} from "../models.ts";
import {
  MEDIA_KINDS,
  toSafeContributionSummary,
  VIGNETTE_TREATMENTS,
} from "../models.ts";

export const MAX_CONTRIBUTIONS_PER_MEMBER = 5;
export const MAX_TOTAL_DURATION_SECONDS = 30;
export const MIN_VIDEO_DURATION_SECONDS = 1;
export const MAX_VIDEO_DURATION_SECONDS = 15;
export const PHOTO_DURATION_SECONDS = 3;
export const MAX_PROCESSING_ATTEMPTS = 2;
export const MAX_DELETIONS_PER_WEEK = 1;

export interface PolicyContext {
  readonly at: IsoTimestamp;
  readonly auditEventId: AuditEventId;
}

export interface CaptureRequest {
  readonly id: ContributionId;
  readonly cycleId: CycleId;
  readonly memberId: MemberId;
  readonly capturedAt: IsoTimestamp;
  readonly mediaKind: MediaKind;
  readonly durationSeconds: number;
  readonly vignetteTreatment: VignetteTreatment;
  readonly localUri: string | null;
}

export interface ValidateCaptureInput {
  readonly request: CaptureRequest;
  readonly group: Group;
  readonly cycle: Cycle;
  readonly existingContributions: readonly Contribution[];
  readonly context: PolicyContext;
}

export interface ContributionBudget {
  readonly usedCount: number;
  readonly usedDurationSeconds: number;
  readonly remainingCount: number;
  readonly remainingDurationSeconds: number;
}

export type PolicyRejectionCode =
  | "not-a-group-member"
  | "cycle-mismatch"
  | "cycle-not-collecting"
  | "duplicate-contribution"
  | "unsupported-media-kind"
  | "unsupported-vignette-treatment"
  | "photo-duration-must-be-three-seconds"
  | "video-duration-out-of-range"
  | "local-file-missing"
  | "contribution-count-limit"
  | "duration-budget-limit"
  | "processing-state-invalid"
  | "processing-attempt-invalid"
  | "not-failed"
  | "retry-limit-reached"
  | "not-a-contributor"
  | "cycle-reveal-closed"
  | "already-deleted"
  | "not-deletable-state"
  | "invalid-week-key"
  | "delete-limit-reached";

export interface PolicyAccepted<T> {
  readonly accepted: true;
  readonly value: T;
  readonly auditEvent: AuditEvent;
  readonly idempotent: boolean;
}

export interface PolicyRejected {
  readonly accepted: false;
  readonly code: PolicyRejectionCode;
  readonly reason: string;
  readonly auditEvent: AuditEvent;
}

export type PolicyOutcome<T> = PolicyAccepted<T> | PolicyRejected;

export interface ContributionTransitionInput {
  readonly contribution: Contribution;
  readonly context: PolicyContext;
}

export interface ValidateSubmissionInput {
  readonly contribution: Contribution;
  readonly group: Group;
  readonly cycle: Cycle;
  readonly actorMemberId: MemberId;
  readonly existingContributions: readonly Contribution[];
  readonly context: PolicyContext;
}

export interface DeletionRecord {
  readonly contributionId: ContributionId;
  readonly memberId: MemberId;
  readonly cycleId: CycleId;
  /** A normalized simulated-week key supplied by the clock/time adapter. */
  readonly weekKey: string;
}

export interface DeleteContributionInput {
  readonly contribution: Contribution;
  readonly group: Group;
  readonly cycle: Cycle;
  readonly actorMemberId: MemberId;
  readonly weekKey: string;
  readonly priorDeletions: readonly DeletionRecord[];
  readonly context: PolicyContext;
}

export interface DeletedContribution {
  readonly contribution: Contribution;
  readonly deletion: DeletionRecord;
}

/** Rehydrate delete allowance state from the persisted local audit trail. */
export function deletionRecordsFromAuditEvents(
  events: readonly AuditEvent[],
): readonly DeletionRecord[] {
  return events.flatMap((event) => {
    if (event.type !== "policy.contribution.deleted") {
      return [];
    }

    const { contributionId, cycleId, memberId, weekKey } = event.metadata;
    if (
      typeof contributionId !== "string" ||
      typeof cycleId !== "string" ||
      typeof memberId !== "string" ||
      typeof weekKey !== "string"
    ) {
      return [];
    }

    return [{ contributionId, cycleId, memberId, weekKey }];
  });
}

/**
 * Calculate the active per-member budget for a cycle. Deleted contributions do
 * not consume either allowance, which is the quota-restoration rule for the
 * one permitted delete.
 */
export function getContributionBudget(
  contributions: readonly Contribution[],
  memberId: MemberId,
  cycleId: CycleId,
): ContributionBudget {
  const activeContributions = contributions.filter(
    (contribution) =>
      contribution.memberId === memberId &&
      contribution.cycleId === cycleId &&
      contribution.state !== "deleted",
  );
  const usedDurationSeconds = activeContributions.reduce(
    (total, contribution) =>
      Number.isFinite(contribution.durationSeconds)
        ? total + contribution.durationSeconds
        : total,
    0,
  );

  return {
    remainingCount: Math.max(
      0,
      MAX_CONTRIBUTIONS_PER_MEMBER - activeContributions.length,
    ),
    remainingDurationSeconds: Math.max(
      0,
      MAX_TOTAL_DURATION_SECONDS - usedDurationSeconds,
    ),
    usedCount: activeContributions.length,
    usedDurationSeconds,
  };
}

/**
 * Validate and materialize a newly accepted capture without touching device
 * APIs or persistence. The returned contribution is still `captured`; later
 * lifecycle commands move it through processing and locking.
 */
export function validateCapture({
  request,
  group,
  cycle,
  existingContributions,
  context,
}: ValidateCaptureInput): PolicyOutcome<Contribution> {
  if (!group.memberIds.includes(request.memberId)) {
    return reject(
      context,
      request.id,
      "not-a-group-member",
      "Only a member of this local group can contribute.",
    );
  }

  if (request.cycleId !== cycle.id || cycle.groupId !== group.id) {
    return reject(
      context,
      request.id,
      "cycle-mismatch",
      "This contribution does not belong to the current group cycle.",
    );
  }

  if (cycle.status !== "collecting") {
    return reject(
      context,
      request.id,
      "cycle-not-collecting",
      "This cycle is not accepting new contributions.",
    );
  }

  if (!isMediaKind(request.mediaKind)) {
    return reject(
      context,
      request.id,
      "unsupported-media-kind",
      "Choose a photo or a short video.",
    );
  }

  if (!isVignetteTreatment(request.vignetteTreatment)) {
    return reject(
      context,
      request.id,
      "unsupported-vignette-treatment",
      "Choose one of the available original vignette treatments.",
    );
  }

  if (
    request.mediaKind === "photo" &&
    request.durationSeconds !== PHOTO_DURATION_SECONDS
  ) {
    return reject(
      context,
      request.id,
      "photo-duration-must-be-three-seconds",
      "A photo uses a fixed three-second display duration.",
    );
  }

  if (
    request.mediaKind === "video" &&
    (!Number.isFinite(request.durationSeconds) ||
      request.durationSeconds < MIN_VIDEO_DURATION_SECONDS ||
      request.durationSeconds > MAX_VIDEO_DURATION_SECONDS)
  ) {
    return reject(
      context,
      request.id,
      "video-duration-out-of-range",
      "Video duration must be between one and 15 seconds.",
    );
  }

  if (existingContributions.some(({ id }) => id === request.id)) {
    return reject(
      context,
      request.id,
      "duplicate-contribution",
      "This contribution has already been recorded.",
    );
  }

  const budget = getContributionBudget(
    existingContributions,
    request.memberId,
    request.cycleId,
  );

  if (budget.remainingCount === 0) {
    return reject(
      context,
      request.id,
      "contribution-count-limit",
      "You have used all five contribution slots for this cycle.",
    );
  }

  if (
    budget.usedDurationSeconds + request.durationSeconds >
    MAX_TOTAL_DURATION_SECONDS
  ) {
    return reject(
      context,
      request.id,
      "duration-budget-limit",
      "That contribution would exceed the 30-second cycle allowance.",
    );
  }

  return accept(
    context,
    request.id,
    {
      ...request,
      deletedAt: null,
      processingAttempt: 0,
      state: "captured",
    },
    "capture.accepted",
  );
}

/**
 * Re-check a persisted capture immediately before submission. Capture metadata
 * is local and can outlive the state it was validated against, so submission
 * must enforce actor, cycle, media, file, and quota rules again.
 */
export function validateContributionForSubmission({
  contribution,
  group,
  cycle,
  actorMemberId,
  existingContributions,
  context,
}: ValidateSubmissionInput): PolicyOutcome<Contribution> {
  if (!group.memberIds.includes(actorMemberId)) {
    return reject(
      context,
      contribution.id,
      "not-a-group-member",
      "Only a member of this local group can submit a contribution.",
    );
  }

  if (actorMemberId !== contribution.memberId) {
    return reject(
      context,
      contribution.id,
      "not-a-contributor",
      "Only the contributor can submit this contribution.",
    );
  }

  if (contribution.cycleId !== cycle.id || cycle.groupId !== group.id) {
    return reject(
      context,
      contribution.id,
      "cycle-mismatch",
      "This contribution does not belong to the current group cycle.",
    );
  }

  if (cycle.status !== "collecting") {
    return reject(
      context,
      contribution.id,
      "cycle-not-collecting",
      "This cycle is not accepting new contributions.",
    );
  }

  if (contribution.state !== "captured") {
    return reject(
      context,
      contribution.id,
      "processing-state-invalid",
      "This contribution is not ready to submit.",
    );
  }

  if (!isMediaKind(contribution.mediaKind)) {
    return reject(
      context,
      contribution.id,
      "unsupported-media-kind",
      "Choose a photo or a short video.",
    );
  }

  if (!isVignetteTreatment(contribution.vignetteTreatment)) {
    return reject(
      context,
      contribution.id,
      "unsupported-vignette-treatment",
      "Choose one of the available original vignette treatments.",
    );
  }

  if (
    contribution.mediaKind === "photo" &&
    contribution.durationSeconds !== PHOTO_DURATION_SECONDS
  ) {
    return reject(
      context,
      contribution.id,
      "photo-duration-must-be-three-seconds",
      "A photo uses a fixed three-second display duration.",
    );
  }

  if (
    contribution.mediaKind === "video" &&
    (!Number.isFinite(contribution.durationSeconds) ||
      contribution.durationSeconds < MIN_VIDEO_DURATION_SECONDS ||
      contribution.durationSeconds > MAX_VIDEO_DURATION_SECONDS)
  ) {
    return reject(
      context,
      contribution.id,
      "video-duration-out-of-range",
      "Video duration must be between one and 15 seconds.",
    );
  }

  if (
    typeof contribution.localUri !== "string" ||
    contribution.localUri.trim().length === 0
  ) {
    return reject(
      context,
      contribution.id,
      "local-file-missing",
      "A local file is required before this contribution can be submitted.",
    );
  }

  if (contribution.processingAttempt !== 0) {
    return reject(
      context,
      contribution.id,
      "processing-attempt-invalid",
      "This contribution already has a processing attempt.",
    );
  }

  const priorContributions = existingContributions.filter(
    ({ id }) => id !== contribution.id,
  );
  const budget = getContributionBudget(
    priorContributions,
    contribution.memberId,
    contribution.cycleId,
  );

  if (budget.remainingCount === 0) {
    return reject(
      context,
      contribution.id,
      "contribution-count-limit",
      "You have used all five contribution slots for this cycle.",
    );
  }

  if (
    budget.usedDurationSeconds + contribution.durationSeconds >
    MAX_TOTAL_DURATION_SECONDS
  ) {
    return reject(
      context,
      contribution.id,
      "duration-budget-limit",
      "That contribution would exceed the 30-second cycle allowance.",
    );
  }

  return accept(context, contribution.id, contribution, "submission.validated");
}

/** Start the first local processing attempt for a captured contribution. */
export function startProcessing({
  contribution,
  context,
}: ContributionTransitionInput): PolicyOutcome<Contribution> {
  if (contribution.state === "processing") {
    return accept(
      context,
      contribution.id,
      contribution,
      "processing.started",
      true,
    );
  }

  if (contribution.state !== "captured") {
    return reject(
      context,
      contribution.id,
      "processing-state-invalid",
      "This contribution is not ready to start processing.",
    );
  }

  if (contribution.processingAttempt !== 0) {
    return reject(
      context,
      contribution.id,
      "processing-attempt-invalid",
      "This contribution already has a processing attempt.",
    );
  }

  return accept(
    context,
    contribution.id,
    { ...contribution, processingAttempt: 1, state: "processing" },
    "processing.started",
  );
}

/** Lock a successfully processed contribution; repeated completion is a no-op. */
export function completeProcessing({
  contribution,
  context,
}: ContributionTransitionInput): PolicyOutcome<Contribution> {
  if (
    contribution.state === "locked" ||
    contribution.state === "revealed" ||
    contribution.state === "archived"
  ) {
    return accept(
      context,
      contribution.id,
      contribution,
      "processing.completed",
      true,
    );
  }

  if (contribution.state !== "processing") {
    return reject(
      context,
      contribution.id,
      "processing-state-invalid",
      "This contribution is not being processed.",
    );
  }

  if (!isValidProcessingAttempt(contribution.processingAttempt)) {
    return reject(
      context,
      contribution.id,
      "processing-attempt-invalid",
      "This contribution has an invalid processing attempt.",
    );
  }

  return accept(
    context,
    contribution.id,
    { ...contribution, state: "locked" },
    "processing.completed",
  );
}

/** Mark an active processing attempt as failed; repeating the failure is safe. */
export function failProcessing({
  contribution,
  context,
}: ContributionTransitionInput): PolicyOutcome<Contribution> {
  if (contribution.state === "failed") {
    return accept(
      context,
      contribution.id,
      contribution,
      "processing.failed",
      true,
    );
  }

  if (contribution.state !== "processing") {
    return reject(
      context,
      contribution.id,
      "processing-state-invalid",
      "This contribution is not being processed.",
    );
  }

  if (!isValidProcessingAttempt(contribution.processingAttempt)) {
    return reject(
      context,
      contribution.id,
      "processing-attempt-invalid",
      "This contribution has an invalid processing attempt.",
    );
  }

  return accept(
    context,
    contribution.id,
    { ...contribution, state: "failed" },
    "processing.failed",
  );
}

/** Retry a failed contribution at most once in V1; duplicate retries are no-ops. */
export function retryProcessing({
  contribution,
  context,
}: ContributionTransitionInput): PolicyOutcome<Contribution> {
  if (
    contribution.state === "processing" ||
    contribution.state === "locked" ||
    contribution.state === "revealed" ||
    contribution.state === "archived"
  ) {
    return accept(
      context,
      contribution.id,
      contribution,
      "processing.retried",
      true,
    );
  }

  if (contribution.state !== "failed") {
    return reject(
      context,
      contribution.id,
      "not-failed",
      "Only a failed contribution can be retried.",
    );
  }

  if (
    !Number.isInteger(contribution.processingAttempt) ||
    contribution.processingAttempt < 1
  ) {
    return reject(
      context,
      contribution.id,
      "processing-attempt-invalid",
      "This contribution has an invalid processing attempt.",
    );
  }

  if (contribution.processingAttempt >= MAX_PROCESSING_ATTEMPTS) {
    return reject(
      context,
      contribution.id,
      "retry-limit-reached",
      "This contribution has used its available retry.",
    );
  }

  return accept(
    context,
    contribution.id,
    {
      ...contribution,
      processingAttempt: contribution.processingAttempt + 1,
      state: "processing",
    },
    "processing.retried",
  );
}

/**
 * Delete one pre-reveal contribution. The normalized week key is supplied by
 * the injected clock/time adapter so this policy never guesses at timezone or
 * DST semantics.
 */
export function deleteContribution({
  contribution,
  group,
  cycle,
  actorMemberId,
  weekKey,
  priorDeletions,
  context,
}: DeleteContributionInput): PolicyOutcome<DeletedContribution> {
  if (!group.memberIds.includes(actorMemberId)) {
    return reject(
      context,
      contribution.id,
      "not-a-group-member",
      "Only a member of this local group can delete a contribution.",
    );
  }

  if (actorMemberId !== contribution.memberId) {
    return reject(
      context,
      contribution.id,
      "not-a-contributor",
      "Only the contributor can delete this contribution.",
    );
  }

  if (contribution.cycleId !== cycle.id || cycle.groupId !== group.id) {
    return reject(
      context,
      contribution.id,
      "cycle-mismatch",
      "This contribution does not belong to the current group cycle.",
    );
  }

  if (typeof weekKey !== "string" || weekKey.trim().length === 0) {
    return reject(
      context,
      contribution.id,
      "invalid-week-key",
      "The simulated week is not available yet.",
    );
  }

  if (contribution.state === "deleted") {
    return reject(
      context,
      contribution.id,
      "already-deleted",
      "This contribution has already been deleted.",
    );
  }

  if (contribution.state === "revealed" || contribution.state === "archived") {
    return reject(
      context,
      contribution.id,
      "cycle-reveal-closed",
      "Revealed contributions can no longer be deleted.",
    );
  }

  if (cycle.status === "premiere" || cycle.status === "archived") {
    return reject(
      context,
      contribution.id,
      "cycle-reveal-closed",
      "This cycle has already been revealed.",
    );
  }

  if (contribution.state === "recording") {
    return reject(
      context,
      contribution.id,
      "not-deletable-state",
      "Finish or discard the active recording before deleting it.",
    );
  }

  const deletionsThisWeek = priorDeletions.filter(
    (deletion) =>
      deletion.memberId === actorMemberId &&
      deletion.cycleId === cycle.id &&
      deletion.weekKey === weekKey,
  ).length;

  if (deletionsThisWeek >= MAX_DELETIONS_PER_WEEK) {
    return reject(
      context,
      contribution.id,
      "delete-limit-reached",
      "Only one contribution can be deleted in the simulated week.",
    );
  }

  const deletion: DeletionRecord = {
    contributionId: contribution.id,
    cycleId: cycle.id,
    memberId: actorMemberId,
    weekKey,
  };

  return accept(
    context,
    contribution.id,
    {
      contribution: {
        ...contribution,
        deletedAt: context.at,
        state: "deleted",
      },
      deletion,
    },
    "contribution.deleted",
    false,
    {
      contributionId: deletion.contributionId,
      cycleId: deletion.cycleId,
      memberId: deletion.memberId,
      weekKey: deletion.weekKey,
    },
  );
}

/**
 * Return only lock-safe pre-reveal summaries. No returned object contains a
 * local URI, thumbnail URI, player source, or other media locator.
 */
export function listPreRevealContributionSummaries(
  contributions: readonly Contribution[],
): readonly SafeContributionSummary[] {
  return contributions
    .filter(
      (contribution) =>
        contribution.state !== "revealed" && contribution.state !== "archived",
    )
    .sort((left, right) =>
      left.capturedAt === right.capturedAt
        ? left.id.localeCompare(right.id)
        : left.capturedAt.localeCompare(right.capturedAt),
    )
    .map(toSafeContributionSummary);
}

function isMediaKind(value: unknown): value is MediaKind {
  return (
    typeof value === "string" &&
    (MEDIA_KINDS as readonly string[]).includes(value)
  );
}

function isVignetteTreatment(value: unknown): value is VignetteTreatment {
  return (
    typeof value === "string" &&
    (VIGNETTE_TREATMENTS as readonly string[]).includes(value)
  );
}

function isValidProcessingAttempt(value: number): boolean {
  return (
    Number.isInteger(value) && value >= 1 && value <= MAX_PROCESSING_ATTEMPTS
  );
}

function accept<T>(
  context: PolicyContext,
  subjectId: string,
  value: T,
  action: string,
  idempotent = false,
  metadata: Readonly<Record<string, string | number | boolean | null>> = {},
): PolicyAccepted<T> {
  return {
    accepted: true,
    auditEvent: makeAuditEvent(context, subjectId, action, {
      idempotent,
      ...metadata,
    }),
    idempotent,
    value,
  };
}

function reject(
  context: PolicyContext,
  subjectId: string,
  code: PolicyRejectionCode,
  reason: string,
): PolicyRejected {
  return {
    accepted: false,
    auditEvent: makeAuditEvent(context, subjectId, "rejected", {
      code,
      reason,
    }),
    code,
    reason,
  };
}

function makeAuditEvent(
  context: PolicyContext,
  subjectId: string,
  action: string,
  metadata: Readonly<Record<string, string | number | boolean | null>>,
): AuditEvent {
  return {
    at: context.at,
    id: context.auditEventId,
    metadata: { action, ...metadata },
    subjectId,
    type: `policy.${action}`,
  };
}

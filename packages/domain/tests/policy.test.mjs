import assert from "node:assert/strict";
import { test } from "node:test";

import { seededCycle, seededGroup } from "../src/fixtures.ts";
import {
  MAX_CONTRIBUTIONS_PER_MEMBER,
  MAX_PROCESSING_ATTEMPTS,
  MAX_TOTAL_DURATION_SECONDS,
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
  PHOTO_DURATION_SECONDS,
  completeProcessing,
  deleteContribution,
  deletionRecordsFromAuditEvents,
  failProcessing,
  getContributionBudget,
  listPreRevealContributionSummaries,
  retryProcessing,
  startProcessing,
  validateCapture,
} from "../src/index.ts";

const NOW = "2026-08-30T10:00:00.000Z";

const baseContext = (id) => ({
  at: NOW,
  auditEventId: id,
});

const baseRequest = (overrides = {}) => ({
  id: "contribution-new",
  cycleId: seededCycle.id,
  memberId: "member-ava",
  capturedAt: "2026-08-30T10:00:00.000Z",
  mediaKind: "video",
  durationSeconds: 5,
  vignetteTreatment: "ccd",
  localUri: "file:///synthetic/new.mov",
  ...overrides,
});

const baseContribution = (overrides = {}) => ({
  id: "contribution-policy",
  cycleId: seededCycle.id,
  memberId: "member-ava",
  capturedAt: "2026-08-30T10:00:00.000Z",
  mediaKind: "video",
  durationSeconds: 5,
  vignetteTreatment: "ccd",
  localUri: "file:///synthetic/policy.mov",
  state: "captured",
  processingAttempt: 0,
  deletedAt: null,
  ...overrides,
});

function assertRejected(outcome, code) {
  assert.equal(outcome.accepted, false);
  assert.equal(outcome.code, code);
  assert.equal(typeof outcome.reason, "string");
  assert.ok(outcome.reason.length > 0);
  assert.equal(outcome.auditEvent.type, "policy.rejected");
  assert.equal(outcome.auditEvent.metadata.code, code);
  assert.equal(outcome.auditEvent.metadata.reason, outcome.reason);
}

function validate(
  request,
  existingContributions = [],
  contextId = "audit-capture",
) {
  return validateCapture({
    context: baseContext(contextId),
    cycle: seededCycle,
    existingContributions,
    group: seededGroup,
    request,
  });
}

test("capture policy enforces membership, media duration, five slots, and 30 seconds", () => {
  const oneSecondVideo = validate(
    baseRequest({ durationSeconds: MIN_VIDEO_DURATION_SECONDS }),
    [],
    "audit-video-min",
  );
  assert.equal(oneSecondVideo.accepted, true);

  const fifteenSecondVideo = validate(
    baseRequest({
      durationSeconds: MAX_VIDEO_DURATION_SECONDS,
      id: "contribution-video-max",
    }),
    [],
    "audit-video-max",
  );
  assert.equal(fifteenSecondVideo.accepted, true);

  assertRejected(
    validate(
      baseRequest({ durationSeconds: MIN_VIDEO_DURATION_SECONDS - 1 }),
      [],
      "audit-video-too-short",
    ),
    "video-duration-out-of-range",
  );
  assertRejected(
    validate(
      baseRequest({ durationSeconds: MAX_VIDEO_DURATION_SECONDS + 1 }),
      [],
      "audit-video-too-long",
    ),
    "video-duration-out-of-range",
  );

  const photo = validate(
    baseRequest({
      durationSeconds: PHOTO_DURATION_SECONDS,
      id: "contribution-photo",
      mediaKind: "photo",
      localUri: "file:///synthetic/new.jpg",
    }),
    [],
    "audit-photo",
  );
  assert.equal(photo.accepted, true);
  assert.equal(photo.value.durationSeconds, PHOTO_DURATION_SECONDS);
  assertRejected(
    validate(
      baseRequest({
        durationSeconds: PHOTO_DURATION_SECONDS - 1,
        id: "contribution-photo-invalid",
        mediaKind: "photo",
      }),
      [],
      "audit-photo-invalid",
    ),
    "photo-duration-must-be-three-seconds",
  );

  const fourContributions = Array.from(
    { length: MAX_CONTRIBUTIONS_PER_MEMBER - 1 },
    (_, index) =>
      baseContribution({
        id: `contribution-slot-${index}`,
        durationSeconds: 3,
        state: "locked",
      }),
  );
  const fifth = validate(
    baseRequest({ durationSeconds: 3, id: "contribution-slot-five" }),
    fourContributions,
    "audit-slot-five",
  );
  assert.equal(fifth.accepted, true);

  const fiveContributions = [
    ...fourContributions,
    baseContribution({
      id: "contribution-slot-five-existing",
      durationSeconds: 3,
    }),
  ];
  assertRejected(
    validate(
      baseRequest({ durationSeconds: 3, id: "contribution-slot-six" }),
      fiveContributions,
      "audit-slot-six",
    ),
    "contribution-count-limit",
  );

  const durationAtLimit = [
    baseContribution({ id: "contribution-duration-15", durationSeconds: 15 }),
    baseContribution({ id: "contribution-duration-12", durationSeconds: 12 }),
  ];
  const exactlyThirty = validate(
    baseRequest({ durationSeconds: 3, id: "contribution-duration-30" }),
    durationAtLimit,
    "audit-duration-thirty",
  );
  assert.equal(exactlyThirty.accepted, true);
  assertRejected(
    validate(
      baseRequest({ durationSeconds: 4, id: "contribution-duration-31" }),
      durationAtLimit,
      "audit-duration-thirty-one",
    ),
    "duration-budget-limit",
  );

  assertRejected(
    validate(
      baseRequest({ id: "contribution-audio", mediaKind: "audio" }),
      [],
      "audit-media-kind",
    ),
    "unsupported-media-kind",
  );
  assertRejected(
    validate(
      baseRequest({ id: "contribution-duplicate" }),
      [baseContribution({ id: "contribution-duplicate" })],
      "audit-duplicate",
    ),
    "duplicate-contribution",
  );
  assertRejected(
    validate(
      baseRequest({ id: "contribution-outsider", memberId: "member-outsider" }),
      [],
      "audit-outsider",
    ),
    "not-a-group-member",
  );
});

test("delete policy restores quota once and rejects a second same-week delete without mutation", () => {
  const contribution = baseContribution({
    id: "contribution-delete-one",
    durationSeconds: 10,
  });
  const first = deleteContribution({
    actorMemberId: contribution.memberId,
    context: baseContext("audit-delete-one"),
    contribution,
    cycle: seededCycle,
    group: seededGroup,
    priorDeletions: [],
    weekKey: "2026-W35",
  });

  assert.equal(first.accepted, true);
  assert.equal(first.value.contribution.state, "deleted");
  assert.equal(first.value.contribution.deletedAt, NOW);
  assert.deepEqual(first.value.deletion, {
    contributionId: contribution.id,
    cycleId: seededCycle.id,
    memberId: contribution.memberId,
    weekKey: "2026-W35",
  });
  assert.deepEqual(deletionRecordsFromAuditEvents([first.auditEvent]), [
    first.value.deletion,
  ]);
  assert.deepEqual(
    getContributionBudget(
      [first.value.contribution],
      contribution.memberId,
      seededCycle.id,
    ),
    {
      remainingCount: MAX_CONTRIBUTIONS_PER_MEMBER,
      remainingDurationSeconds: MAX_TOTAL_DURATION_SECONDS,
      usedCount: 0,
      usedDurationSeconds: 0,
    },
  );
  const retake = validate(
    baseRequest({ durationSeconds: 15, id: "contribution-retake" }),
    [first.value.contribution],
    "audit-retake",
  );
  assert.equal(retake.accepted, true);

  const secondContribution = baseContribution({
    id: "contribution-delete-two",
    durationSeconds: 4,
  });
  const second = deleteContribution({
    actorMemberId: secondContribution.memberId,
    context: baseContext("audit-delete-two"),
    contribution: secondContribution,
    cycle: seededCycle,
    group: seededGroup,
    priorDeletions: deletionRecordsFromAuditEvents([first.auditEvent]),
    weekKey: "2026-W35",
  });
  assertRejected(second, "delete-limit-reached");
  assert.equal(secondContribution.state, "captured");

  const nextWeek = deleteContribution({
    actorMemberId: secondContribution.memberId,
    context: baseContext("audit-delete-next-week"),
    contribution: secondContribution,
    cycle: seededCycle,
    group: seededGroup,
    priorDeletions: [first.value.deletion],
    weekKey: "2026-W36",
  });
  assert.equal(nextWeek.accepted, true);

  assertRejected(
    deleteContribution({
      actorMemberId: contribution.memberId,
      context: baseContext("audit-delete-again"),
      contribution: first.value.contribution,
      cycle: seededCycle,
      group: seededGroup,
      priorDeletions: [first.value.deletion],
      weekKey: "2026-W35",
    }),
    "already-deleted",
  );
  assertRejected(
    deleteContribution({
      actorMemberId: "member-ben",
      context: baseContext("audit-delete-owner"),
      contribution,
      cycle: seededCycle,
      group: seededGroup,
      priorDeletions: [],
      weekKey: "2026-W37",
    }),
    "not-a-contributor",
  );
});

test("processing transitions are bounded, auditable, and idempotent", () => {
  const captured = baseContribution();
  const processing = startProcessing({
    context: baseContext("audit-processing-start"),
    contribution: captured,
  });
  assert.equal(processing.accepted, true);
  assert.equal(processing.value.state, "processing");
  assert.equal(processing.value.processingAttempt, 1);

  const duplicateStart = startProcessing({
    context: baseContext("audit-processing-start-duplicate"),
    contribution: processing.value,
  });
  assert.equal(duplicateStart.accepted, true);
  assert.equal(duplicateStart.idempotent, true);
  assert.deepEqual(duplicateStart.value, processing.value);

  const failed = failProcessing({
    context: baseContext("audit-processing-failed"),
    contribution: processing.value,
  });
  assert.equal(failed.accepted, true);
  assert.equal(failed.value.state, "failed");
  assert.equal(failed.value.processingAttempt, 1);

  const retried = retryProcessing({
    context: baseContext("audit-processing-retry"),
    contribution: failed.value,
  });
  assert.equal(retried.accepted, true);
  assert.equal(retried.value.state, "processing");
  assert.equal(retried.value.processingAttempt, MAX_PROCESSING_ATTEMPTS);

  const duplicateRetry = retryProcessing({
    context: baseContext("audit-processing-retry-duplicate"),
    contribution: retried.value,
  });
  assert.equal(duplicateRetry.accepted, true);
  assert.equal(duplicateRetry.idempotent, true);
  assert.deepEqual(duplicateRetry.value, retried.value);

  const locked = completeProcessing({
    context: baseContext("audit-processing-complete"),
    contribution: retried.value,
  });
  assert.equal(locked.accepted, true);
  assert.equal(locked.value.state, "locked");

  const duplicateCompletion = completeProcessing({
    context: baseContext("audit-processing-complete-duplicate"),
    contribution: locked.value,
  });
  assert.equal(duplicateCompletion.accepted, true);
  assert.equal(duplicateCompletion.idempotent, true);
  assert.deepEqual(duplicateCompletion.value, locked.value);

  const failedSecondAttempt = failProcessing({
    context: baseContext("audit-processing-failed-second"),
    contribution: retried.value,
  });
  const exhaustedRetry = retryProcessing({
    context: baseContext("audit-processing-retry-exhausted"),
    contribution: failedSecondAttempt.value,
  });
  assertRejected(exhaustedRetry, "retry-limit-reached");
  assert.equal(
    failedSecondAttempt.value.processingAttempt,
    MAX_PROCESSING_ATTEMPTS,
  );
  assert.equal(failedSecondAttempt.value.state, "failed");

  assertRejected(
    completeProcessing({
      context: baseContext("audit-processing-invalid"),
      contribution: captured,
    }),
    "processing-state-invalid",
  );
  assertRejected(
    retryProcessing({
      context: baseContext("audit-processing-not-failed"),
      contribution: captured,
    }),
    "not-failed",
  );
});

test("pre-reveal summaries never expose media locators", () => {
  const summaries = listPreRevealContributionSummaries([
    baseContribution({
      id: "locked-later",
      capturedAt: "2026-08-30T11:00:00.000Z",
      state: "locked",
    }),
    baseContribution({ id: "revealed", state: "revealed" }),
    baseContribution({
      id: "locked-earlier",
      capturedAt: "2026-08-30T09:00:00.000Z",
      state: "locked",
    }),
  ]);

  assert.deepEqual(
    summaries.map(({ id }) => id),
    ["locked-earlier", "locked-later"],
  );
  for (const summary of summaries) {
    assert.equal("localUri" in summary, false);
    assert.equal("thumbnailUri" in summary, false);
    assert.equal("playerSource" in summary, false);
  }
});

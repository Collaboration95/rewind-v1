import type {
  AuditEvent,
  AuditEventId,
  Contribution,
  Cycle,
  CycleStatus,
  IsoTimestamp,
} from "../models.ts";
import { addIsoSeconds } from "../time/simulation-clock.ts";

export interface CyclePolicyContext {
  readonly at: IsoTimestamp;
  readonly auditEventId: AuditEventId;
}

export interface CycleTransitionInput {
  readonly cycle: Cycle;
  readonly targetStatus: CycleStatus;
  readonly contributions: readonly Contribution[];
  readonly context: CyclePolicyContext;
}

export type CycleRejectionCode =
  | "cycle-not-ready"
  | "invalid-transition"
  | "contributions-not-locked"
  | "failed-contributions-require-delay"
  | "delay-requires-processing-failure"
  | "processing-failure-remains";

export interface CycleTransitionAccepted {
  readonly accepted: true;
  readonly cycle: Cycle;
  readonly auditEvent: AuditEvent;
  readonly idempotent: boolean;
}

export interface CycleTransitionRejected {
  readonly accepted: false;
  readonly code: CycleRejectionCode;
  readonly reason: string;
  readonly auditEvent: AuditEvent;
}

export type CycleTransitionOutcome =
  CycleTransitionAccepted | CycleTransitionRejected;

export const REVEAL_ELIGIBLE_CONTRIBUTION_STATES = [
  "locked",
  "revealed",
  "archived",
] as const;

/** Return the instant at which a collecting cycle ends. */
export function cycleEndAt(cycle: Cycle): IsoTimestamp {
  return addIsoSeconds(cycle.startAt, cycle.durationSeconds);
}

/**
 * Move a cycle through the explicit local reveal state machine. The caller
 * supplies the current instant and contributions; this function performs no
 * persistence or wall-clock scheduling.
 */
export function transitionCycle({
  cycle,
  targetStatus,
  contributions,
  context,
}: CycleTransitionInput): CycleTransitionOutcome {
  if (cycle.status === targetStatus) {
    return accept(context, cycle, true);
  }

  if (cycle.status === "collecting" && targetStatus === "reveal_pending") {
    if (Date.parse(context.at) < Date.parse(cycleEndAt(cycle))) {
      return reject(
        context,
        cycle.id,
        "cycle-not-ready",
        "The cycle is still collecting contributions.",
      );
    }
    return accept(
      context,
      { ...cycle, status: "reveal_pending" },
      false,
      cycle.status,
    );
  }

  if (cycle.status === "reveal_pending" && targetStatus === "delayed") {
    if (!hasFailedContribution(cycle, contributions)) {
      return reject(
        context,
        cycle.id,
        "delay-requires-processing-failure",
        "The cycle can be delayed only when processing has failed.",
      );
    }
    return accept(
      context,
      { ...cycle, status: "delayed" },
      false,
      cycle.status,
    );
  }

  if (
    (cycle.status === "reveal_pending" || cycle.status === "delayed") &&
    targetStatus === "premiere"
  ) {
    if (hasFailedContribution(cycle, contributions)) {
      return reject(
        context,
        cycle.id,
        cycle.status === "delayed"
          ? "processing-failure-remains"
          : "failed-contributions-require-delay",
        cycle.status === "delayed"
          ? "Retry the failed contributions before starting the premiere."
          : "Move the cycle to delayed while a contribution has failed.",
      );
    }

    if (!allContributionsReady(cycle, contributions)) {
      return reject(
        context,
        cycle.id,
        "contributions-not-locked",
        "All contributions must finish processing before the premiere.",
      );
    }
    return accept(
      context,
      { ...cycle, status: "premiere" },
      false,
      cycle.status,
    );
  }

  if (cycle.status === "premiere" && targetStatus === "archived") {
    return accept(
      context,
      { ...cycle, status: "archived" },
      false,
      cycle.status,
    );
  }

  return reject(
    context,
    cycle.id,
    "invalid-transition",
    `The cycle cannot move from ${cycle.status} to ${targetStatus}.`,
  );
}

export function isRevealEligibleContribution(
  contribution: Contribution,
): boolean {
  return (REVEAL_ELIGIBLE_CONTRIBUTION_STATES as readonly string[]).includes(
    contribution.state,
  );
}

function hasFailedContribution(
  cycle: Cycle,
  contributions: readonly Contribution[],
): boolean {
  return contributions.some(
    (contribution) =>
      contribution.cycleId === cycle.id && contribution.state === "failed",
  );
}

function allContributionsReady(
  cycle: Cycle,
  contributions: readonly Contribution[],
): boolean {
  return contributions
    .filter(
      (contribution) =>
        contribution.cycleId === cycle.id && contribution.state !== "deleted",
    )
    .every(isRevealEligibleContribution);
}

function accept(
  context: CyclePolicyContext,
  cycle: Cycle,
  idempotent: boolean,
  previousStatus = cycle.status,
): CycleTransitionAccepted {
  return {
    accepted: true,
    auditEvent: makeAuditEvent(context, cycle.id, "transitioned", {
      from: previousStatus,
      idempotent,
      to: cycle.status,
    }),
    cycle,
    idempotent,
  };
}

function reject(
  context: CyclePolicyContext,
  subjectId: string,
  code: CycleRejectionCode,
  reason: string,
): CycleTransitionRejected {
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
  context: CyclePolicyContext,
  subjectId: string,
  action: string,
  metadata: Readonly<Record<string, string | number | boolean | null>>,
): AuditEvent {
  return {
    at: context.at,
    id: context.auditEventId,
    metadata: { action, ...metadata },
    subjectId,
    type: `cycle.${action}`,
  };
}

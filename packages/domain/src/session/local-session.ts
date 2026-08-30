import type {
  AuditEvent,
  AuditEventId,
  Group,
  GroupId,
  IsoTimestamp,
  MemberId,
} from "../models.ts";

export interface SessionPolicyContext {
  readonly at: IsoTimestamp;
  readonly auditEventId: AuditEventId;
}

export interface LocalSession {
  readonly groupId: GroupId;
  readonly activeMemberId: MemberId;
}

export type SessionRejectionCode = "not-a-group-member";

export interface SessionSelectionAccepted {
  readonly accepted: true;
  readonly value: LocalSession;
  readonly auditEvent: AuditEvent;
  readonly idempotent: boolean;
}

export interface SessionSelectionRejected {
  readonly accepted: false;
  readonly code: SessionRejectionCode;
  readonly reason: string;
  readonly auditEvent: AuditEvent;
}

export type SessionSelectionOutcome =
  | SessionSelectionAccepted
  | SessionSelectionRejected;

export interface SelectLocalMemberInput {
  readonly group: Group;
  readonly memberId: MemberId;
  readonly context: SessionPolicyContext;
}

export function isGroupMember(group: Group, memberId: MemberId): boolean {
  return group.memberIds.includes(memberId);
}

/**
 * Select a synthetic actor for local commands. This is deliberately a
 * membership check, not authentication or an authorization claim.
 */
export function selectLocalMember({
  group,
  memberId,
  context,
}: SelectLocalMemberInput): SessionSelectionOutcome {
  if (!isGroupMember(group, memberId)) {
    return {
      accepted: false,
      auditEvent: makeAuditEvent(context, memberId, "rejected", {
        code: "not-a-group-member",
        reason: "Choose one of the five local demo profiles.",
      }),
      code: "not-a-group-member",
      reason: "Choose one of the five local demo profiles.",
    };
  }

  return {
    accepted: true,
    auditEvent: makeAuditEvent(context, memberId, "selected", {
      groupId: group.id,
    }),
    idempotent: false,
    value: { activeMemberId: memberId, groupId: group.id },
  };
}

function makeAuditEvent(
  context: SessionPolicyContext,
  subjectId: string,
  action: string,
  metadata: Readonly<Record<string, string | number | boolean | null>>,
): AuditEvent {
  return {
    at: context.at,
    id: context.auditEventId,
    metadata: { action, ...metadata },
    subjectId,
    type: `session.profile.${action}`,
  };
}

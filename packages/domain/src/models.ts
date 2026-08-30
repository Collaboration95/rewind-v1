export type IsoTimestamp = string;

export type MemberId = string;
export type GroupId = string;
export type CycleId = string;
export type ContributionId = string;
export type MessageId = string;
export type ReactionId = string;
export type CapsuleId = string;
export type AuditEventId = string;

export const MEDIA_KINDS = ["photo", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const VIGNETTE_TREATMENTS = [
  "flash",
  "ccd",
  "home-movie",
  "tape",
] as const;
export type VignetteTreatment = (typeof VIGNETTE_TREATMENTS)[number];

export const CYCLE_STATUSES = [
  "collecting",
  "reveal_pending",
  "premiere",
  "delayed",
  "archived",
] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export const CONTRIBUTION_STATES = [
  "recording",
  "captured",
  "processing",
  "locked",
  "failed",
  "revealed",
  "archived",
  "deleted",
] as const;
export type ContributionState = (typeof CONTRIBUTION_STATES)[number];

export const CAPSULE_STATUSES = ["premiere", "archived"] as const;
export type CapsuleStatus = (typeof CAPSULE_STATUSES)[number];

export const SIMULATION_MODES = [
  "real",
  "demo-minute",
  "demo-day",
  "demo-cycle",
] as const;
export type SimulationMode = (typeof SIMULATION_MODES)[number];

export interface Member {
  readonly id: MemberId;
  readonly displayName: string;
  readonly avatarSeed: string;
}

export interface Group {
  readonly id: GroupId;
  readonly name: string;
  readonly timezone: string;
  readonly memberIds: readonly MemberId[];
  readonly prompt: string;
}

export interface Cycle {
  readonly id: CycleId;
  readonly groupId: GroupId;
  readonly startAt: IsoTimestamp;
  readonly durationSeconds: number;
  readonly status: CycleStatus;
}

export interface Contribution {
  readonly id: ContributionId;
  readonly cycleId: CycleId;
  readonly memberId: MemberId;
  readonly capturedAt: IsoTimestamp;
  readonly mediaKind: MediaKind;
  readonly durationSeconds: number;
  readonly vignetteTreatment: VignetteTreatment;
  readonly localUri: string | null;
  readonly state: ContributionState;
  readonly processingAttempt: number;
  readonly deletedAt: IsoTimestamp | null;
}

export interface Message {
  readonly id: MessageId;
  readonly groupId: GroupId;
  readonly memberId: MemberId;
  readonly body: string;
  readonly replyToId: MessageId | null;
  readonly createdAt: IsoTimestamp;
}

export interface Reaction {
  readonly id: ReactionId;
  readonly messageId: MessageId;
  readonly memberId: MemberId;
  readonly emoji: string;
}

export interface Capsule {
  readonly id: CapsuleId;
  readonly cycleId: CycleId;
  readonly contributionIds: readonly ContributionId[];
  readonly status: CapsuleStatus;
  readonly revealedAt: IsoTimestamp | null;
}

export interface ReminderPreference {
  readonly memberId: MemberId;
  readonly enabled: boolean;
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
  readonly notificationId: string | null;
}

export interface SimulationClock {
  readonly now: IsoTimestamp;
  readonly mode: SimulationMode;
}

export type AuditMetadataValue = string | number | boolean | null;

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly type: string;
  readonly at: IsoTimestamp;
  readonly subjectId: string;
  readonly metadata: Readonly<Record<string, AuditMetadataValue>>;
}

/**
 * The normal pre-reveal UI may use this view, which intentionally has no local
 * URI, thumbnail, or other media locator.
 */
export interface SafeContributionSummary {
  readonly id: ContributionId;
  readonly memberId: MemberId;
  readonly capturedAt: IsoTimestamp;
  readonly mediaKind: MediaKind;
  readonly durationSeconds: number;
  readonly vignetteTreatment: VignetteTreatment;
  readonly state: ContributionState;
}

export function toSafeContributionSummary(
  contribution: Contribution,
): SafeContributionSummary {
  return {
    id: contribution.id,
    memberId: contribution.memberId,
    capturedAt: contribution.capturedAt,
    mediaKind: contribution.mediaKind,
    durationSeconds: contribution.durationSeconds,
    vignetteTreatment: contribution.vignetteTreatment,
    state: contribution.state,
  };
}

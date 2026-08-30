import type {
  AuditEvent,
  Capsule,
  Contribution,
  Cycle,
  Group,
  Member,
  Message,
  Reaction,
  ReminderPreference,
  SimulationClock,
} from "./models.ts";

export interface DomainFixture {
  readonly members: readonly Member[];
  readonly group: Group;
  readonly cycle: Cycle;
  readonly contributions: readonly Contribution[];
  readonly messages: readonly Message[];
  readonly reactions: readonly Reaction[];
  readonly capsule: Capsule;
  readonly reminder: ReminderPreference;
  readonly clock: SimulationClock;
  readonly auditEvents: readonly AuditEvent[];
}

export const seededMembers: readonly Member[] = [
  { id: "member-ava", displayName: "Ava", avatarSeed: "amber" },
  { id: "member-ben", displayName: "Ben", avatarSeed: "blue" },
  { id: "member-cleo", displayName: "Cleo", avatarSeed: "coral" },
  { id: "member-dev", displayName: "Dev", avatarSeed: "green" },
  { id: "member-finn", displayName: "Finn", avatarSeed: "violet" },
];

export const seededGroup: Group = {
  id: "group-rewind-demo",
  name: "The Sunday Room",
  timezone: "Asia/Singapore",
  memberIds: seededMembers.map((member) => member.id),
  prompt: "What deserves a frame this week?",
};

export const seededCycle: Cycle = {
  id: "cycle-rewind-demo",
  groupId: seededGroup.id,
  startAt: "2026-08-30T00:00:00.000Z",
  durationSeconds: 7 * 24 * 60 * 60,
  status: "collecting",
};

export const seededContributions: readonly Contribution[] = [
  {
    id: "contribution-photo-demo",
    cycleId: seededCycle.id,
    memberId: "member-ava",
    capturedAt: "2026-08-30T08:00:00.000Z",
    mediaKind: "photo",
    durationSeconds: 3,
    vignetteTreatment: "ccd",
    localUri: "file:///synthetic/rewind-photo-demo.jpg",
    state: "locked",
    processingAttempt: 1,
    deletedAt: null,
  },
  {
    id: "contribution-video-demo",
    cycleId: seededCycle.id,
    memberId: "member-ben",
    capturedAt: "2026-08-30T09:00:00.000Z",
    mediaKind: "video",
    durationSeconds: 5,
    vignetteTreatment: "flash",
    localUri: "file:///synthetic/rewind-video-demo.mov",
    state: "locked",
    processingAttempt: 1,
    deletedAt: null,
  },
];

export const seededMessages: readonly Message[] = [
  {
    id: "message-demo-1",
    groupId: seededGroup.id,
    memberId: "member-cleo",
    body: "The light after rain counts.",
    replyToId: null,
    createdAt: "2026-08-30T10:00:00.000Z",
  },
];

export const seededReactions: readonly Reaction[] = [];

export const seededCapsule: Capsule = {
  id: "capsule-rewind-demo",
  cycleId: seededCycle.id,
  contributionIds: seededContributions.map((contribution) => contribution.id),
  status: "premiere",
  revealedAt: null,
};

export const seededReminder: ReminderPreference = {
  memberId: "member-ava",
  enabled: false,
  weekday: 0,
  hour: 18,
  minute: 0,
  notificationId: null,
};

export const seededClock: SimulationClock = {
  now: "2026-08-30T10:00:00.000Z",
  mode: "demo-cycle",
};

export const seededAuditEvents: readonly AuditEvent[] = [];

export const seededDomainFixture: DomainFixture = {
  members: seededMembers,
  group: seededGroup,
  cycle: seededCycle,
  contributions: seededContributions,
  messages: seededMessages,
  reactions: seededReactions,
  capsule: seededCapsule,
  reminder: seededReminder,
  clock: seededClock,
  auditEvents: seededAuditEvents,
};

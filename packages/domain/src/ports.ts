import type {
  AuditEvent,
  Capsule,
  CapsuleId,
  Contribution,
  ContributionId,
  Cycle,
  CycleId,
  Group,
  GroupId,
  IsoTimestamp,
  Member,
  MemberId,
  Message,
  MessageId,
  Reaction,
  ReactionId,
  ReminderPreference,
} from "./models.ts";

export interface ClockPort {
  now(): IsoTimestamp;
}

export interface IdGeneratorPort {
  next(prefix: string): string;
}

export interface TransactionPort {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface MemberRepositoryPort {
  get(memberId: MemberId): Promise<Member | null>;
  listByGroup(groupId: GroupId): Promise<readonly Member[]>;
}

export interface GroupRepositoryPort {
  get(groupId: GroupId): Promise<Group | null>;
}

export interface CycleRepositoryPort {
  get(cycleId: CycleId): Promise<Cycle | null>;
  getCollecting(groupId: GroupId, at: IsoTimestamp): Promise<Cycle | null>;
  save(cycle: Cycle): Promise<void>;
}

export interface ContributionRepositoryPort {
  get(contributionId: ContributionId): Promise<Contribution | null>;
  listByCycle(cycleId: CycleId): Promise<readonly Contribution[]>;
  save(contribution: Contribution): Promise<void>;
  remove(contributionId: ContributionId): Promise<void>;
}

export interface MessageRepositoryPort {
  listByGroup(groupId: GroupId): Promise<readonly Message[]>;
  get(messageId: MessageId): Promise<Message | null>;
  save(message: Message): Promise<void>;
}

export interface ReactionRepositoryPort {
  listByMessage(messageId: MessageId): Promise<readonly Reaction[]>;
  save(reaction: Reaction): Promise<void>;
  remove(reactionId: ReactionId): Promise<void>;
}

export interface CapsuleRepositoryPort {
  get(capsuleId: CapsuleId): Promise<Capsule | null>;
  getByCycle(cycleId: CycleId): Promise<Capsule | null>;
  save(capsule: Capsule): Promise<void>;
}

export interface ReminderRepositoryPort {
  get(memberId: MemberId): Promise<ReminderPreference | null>;
  save(preference: ReminderPreference): Promise<void>;
}

export interface AuditRepositoryPort {
  append(event: AuditEvent): Promise<void>;
  list(subjectId?: string): Promise<readonly AuditEvent[]>;
}

export interface DomainRepositoryPort {
  readonly members: MemberRepositoryPort;
  readonly groups: GroupRepositoryPort;
  readonly cycles: CycleRepositoryPort;
  readonly contributions: ContributionRepositoryPort;
  readonly messages: MessageRepositoryPort;
  readonly reactions: ReactionRepositoryPort;
  readonly capsules: CapsuleRepositoryPort;
  readonly reminders: ReminderRepositoryPort;
  readonly audit: AuditRepositoryPort;
}

export interface SeedResetPort {
  resetToSeed(): Promise<void>;
}

/**
 * The application layer receives these ports; it does not receive a database,
 * SQLite connection, cloud client, or device module.
 */
export interface LocalDomainPorts {
  readonly repository: DomainRepositoryPort;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly transaction: TransactionPort;
  readonly seed: SeedResetPort;
}

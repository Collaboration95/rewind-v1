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
} from '../../../../packages/domain/src/models';
import type {
  AuditRepositoryPort,
  CapsuleRepositoryPort,
  ContributionRepositoryPort,
  CycleRepositoryPort,
  DomainRepositoryPort,
  GroupRepositoryPort,
  MemberRepositoryPort,
  MessageRepositoryPort,
  ReactionRepositoryPort,
  ReminderRepositoryPort,
} from '../../../../packages/domain/src/ports';

import type { LocalSqliteDriver } from './local-sqlite';

type MemberRow = {
  avatar_seed: string;
  display_name: string;
  id: string;
};

type GroupRow = {
  id: string;
  name: string;
  prompt: string;
  timezone: string;
};

type GroupMemberRow = { member_id: string };

type CycleRow = {
  duration_seconds: number;
  group_id: string;
  id: string;
  start_at: string;
  status: Cycle['status'];
};

type ContributionRow = {
  captured_at: string;
  cycle_id: string;
  deleted_at: string | null;
  duration_seconds: number;
  id: string;
  local_uri: string | null;
  media_kind: Contribution['mediaKind'];
  member_id: string;
  processing_attempt: number;
  state: Contribution['state'];
  vignette_treatment: Contribution['vignetteTreatment'];
};

type MessageRow = {
  body: string;
  created_at: string;
  group_id: string;
  id: string;
  member_id: string;
  reply_to_id: string | null;
};

type ReactionRow = {
  emoji: string;
  id: string;
  member_id: string;
  message_id: string;
};

type CapsuleRow = {
  contribution_ids_json: string;
  cycle_id: string;
  id: string;
  revealed_at: string | null;
  status: Capsule['status'];
};

type ReminderRow = {
  enabled: number;
  hour: number;
  member_id: string;
  minute: number;
  notification_id: string | null;
  weekday: number;
};

type AuditRow = {
  at: string;
  id: string;
  metadata_json: string;
  subject_id: string;
  type: string;
};

export class SQLiteDomainRepository implements DomainRepositoryPort {
  private readonly database: LocalSqliteDriver;

  public readonly audit: AuditRepositoryPort;
  public readonly capsules: CapsuleRepositoryPort;
  public readonly contributions: ContributionRepositoryPort;
  public readonly cycles: CycleRepositoryPort;
  public readonly groups: GroupRepositoryPort;
  public readonly members: MemberRepositoryPort;
  public readonly messages: MessageRepositoryPort;
  public readonly reactions: ReactionRepositoryPort;
  public readonly reminders: ReminderRepositoryPort;

  public constructor(database: LocalSqliteDriver) {
    this.database = database;
    this.members = {
      get: (memberId) => this.getMember(memberId),
      listByGroup: (groupId) => this.listMembersByGroup(groupId),
    };
    this.groups = {
      get: (groupId) => this.getGroup(groupId),
    };
    this.cycles = {
      get: (cycleId) => this.getCycle(cycleId),
      getCollecting: (groupId, at) => this.getCollectingCycle(groupId, at),
      save: (cycle) => this.saveCycle(cycle),
    };
    this.contributions = {
      get: (contributionId) => this.getContribution(contributionId),
      listByCycle: (cycleId) => this.listContributionsByCycle(cycleId),
      remove: (contributionId) => this.removeContribution(contributionId),
      save: (contribution) => this.saveContribution(contribution),
    };
    this.messages = {
      get: (messageId) => this.getMessage(messageId),
      listByGroup: (groupId) => this.listMessagesByGroup(groupId),
      save: (message) => this.saveMessage(message),
    };
    this.reactions = {
      listByMessage: (messageId) => this.listReactionsByMessage(messageId),
      remove: (reactionId) => this.removeReaction(reactionId),
      save: (reaction) => this.saveReaction(reaction),
    };
    this.capsules = {
      get: (capsuleId) => this.getCapsule(capsuleId),
      getByCycle: (cycleId) => this.getCapsuleByCycle(cycleId),
      save: (capsule) => this.saveCapsule(capsule),
    };
    this.reminders = {
      get: (memberId) => this.getReminder(memberId),
      save: (preference) => this.saveReminder(preference),
    };
    this.audit = {
      append: (event) => this.appendAuditEvent(event),
      list: (subjectId) => this.listAuditEvents(subjectId),
    };
  }

  private async getMember(memberId: string): Promise<Member | null> {
    const row = await this.database.getFirstAsync<MemberRow>(
      'SELECT id, display_name, avatar_seed FROM members WHERE id = ?',
      [memberId],
    );
    return row ? mapMember(row) : null;
  }

  private async listMembersByGroup(groupId: string): Promise<readonly Member[]> {
    const rows = await this.database.getAllAsync<MemberRow>(
      `SELECT m.id, m.display_name, m.avatar_seed
       FROM members m
       INNER JOIN group_members gm ON gm.member_id = m.id
       WHERE gm.group_id = ?
       ORDER BY m.id`,
      [groupId],
    );
    return rows.map(mapMember);
  }

  private async getGroup(groupId: string): Promise<Group | null> {
    const row = await this.database.getFirstAsync<GroupRow>(
      'SELECT id, name, timezone, prompt FROM groups WHERE id = ?',
      [groupId],
    );
    if (!row) {
      return null;
    }

    const members = await this.database.getAllAsync<GroupMemberRow>(
      'SELECT member_id FROM group_members WHERE group_id = ? ORDER BY member_id',
      [groupId],
    );
    return {
      id: row.id,
      memberIds: members.map(({ member_id }) => member_id),
      name: row.name,
      prompt: row.prompt,
      timezone: row.timezone,
    };
  }

  private async getCycle(cycleId: string): Promise<Cycle | null> {
    const row = await this.database.getFirstAsync<CycleRow>(
      'SELECT id, group_id, start_at, duration_seconds, status FROM cycles WHERE id = ?',
      [cycleId],
    );
    return row ? mapCycle(row) : null;
  }

  private async getCollectingCycle(groupId: string, at: string): Promise<Cycle | null> {
    const row = await this.database.getFirstAsync<CycleRow>(
      `SELECT id, group_id, start_at, duration_seconds, status
       FROM cycles
       WHERE group_id = ?
         AND status = 'collecting'
         AND start_at <= ?
         AND datetime(start_at, '+' || duration_seconds || ' seconds') > datetime(?)
       ORDER BY start_at DESC
       LIMIT 1`,
      [groupId, at, at],
    );
    return row ? mapCycle(row) : null;
  }

  private async saveCycle(cycle: Cycle): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO cycles (id, group_id, start_at, duration_seconds, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         group_id = excluded.group_id,
         start_at = excluded.start_at,
         duration_seconds = excluded.duration_seconds,
         status = excluded.status`,
      [cycle.id, cycle.groupId, cycle.startAt, cycle.durationSeconds, cycle.status],
    );
  }

  private async getContribution(contributionId: string): Promise<Contribution | null> {
    const row = await this.database.getFirstAsync<ContributionRow>(
      `SELECT id, cycle_id, member_id, captured_at, media_kind, duration_seconds,
              vignette_treatment, local_uri, state, processing_attempt, deleted_at
       FROM contributions WHERE id = ?`,
      [contributionId],
    );
    return row ? mapContribution(row) : null;
  }

  private async listContributionsByCycle(cycleId: string): Promise<readonly Contribution[]> {
    const rows = await this.database.getAllAsync<ContributionRow>(
      `SELECT id, cycle_id, member_id, captured_at, media_kind, duration_seconds,
              vignette_treatment, local_uri, state, processing_attempt, deleted_at
       FROM contributions WHERE cycle_id = ? ORDER BY captured_at, id`,
      [cycleId],
    );
    return rows.map(mapContribution);
  }

  private async saveContribution(contribution: Contribution): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO contributions
        (id, cycle_id, member_id, captured_at, media_kind, duration_seconds,
         vignette_treatment, local_uri, state, processing_attempt, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         cycle_id = excluded.cycle_id,
         member_id = excluded.member_id,
         captured_at = excluded.captured_at,
         media_kind = excluded.media_kind,
         duration_seconds = excluded.duration_seconds,
         vignette_treatment = excluded.vignette_treatment,
         local_uri = excluded.local_uri,
         state = excluded.state,
         processing_attempt = excluded.processing_attempt,
         deleted_at = excluded.deleted_at`,
      [
        contribution.id,
        contribution.cycleId,
        contribution.memberId,
        contribution.capturedAt,
        contribution.mediaKind,
        contribution.durationSeconds,
        contribution.vignetteTreatment,
        contribution.localUri,
        contribution.state,
        contribution.processingAttempt,
        contribution.deletedAt,
      ],
    );
  }

  private async removeContribution(contributionId: string): Promise<void> {
    await this.database.runAsync('DELETE FROM contributions WHERE id = ?', [contributionId]);
  }

  private async getMessage(messageId: string): Promise<Message | null> {
    const row = await this.database.getFirstAsync<MessageRow>(
      `SELECT id, group_id, member_id, body, reply_to_id, created_at
       FROM messages WHERE id = ?`,
      [messageId],
    );
    return row ? mapMessage(row) : null;
  }

  private async listMessagesByGroup(groupId: string): Promise<readonly Message[]> {
    const rows = await this.database.getAllAsync<MessageRow>(
      `SELECT id, group_id, member_id, body, reply_to_id, created_at
       FROM messages WHERE group_id = ? ORDER BY created_at, id`,
      [groupId],
    );
    return rows.map(mapMessage);
  }

  private async saveMessage(message: Message): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO messages (id, group_id, member_id, body, reply_to_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         group_id = excluded.group_id,
         member_id = excluded.member_id,
         body = excluded.body,
         reply_to_id = excluded.reply_to_id,
         created_at = excluded.created_at`,
      [
        message.id,
        message.groupId,
        message.memberId,
        message.body,
        message.replyToId,
        message.createdAt,
      ],
    );
  }

  private async listReactionsByMessage(messageId: string): Promise<readonly Reaction[]> {
    const rows = await this.database.getAllAsync<ReactionRow>(
      `SELECT id, message_id, member_id, emoji
       FROM reactions WHERE message_id = ? ORDER BY id`,
      [messageId],
    );
    return rows.map(mapReaction);
  }

  private async saveReaction(reaction: Reaction): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO reactions (id, message_id, member_id, emoji)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         message_id = excluded.message_id,
         member_id = excluded.member_id,
         emoji = excluded.emoji`,
      [reaction.id, reaction.messageId, reaction.memberId, reaction.emoji],
    );
  }

  private async removeReaction(reactionId: string): Promise<void> {
    await this.database.runAsync('DELETE FROM reactions WHERE id = ?', [reactionId]);
  }

  private async getCapsule(capsuleId: string): Promise<Capsule | null> {
    const row = await this.database.getFirstAsync<CapsuleRow>(
      `SELECT id, cycle_id, contribution_ids_json, status, revealed_at
       FROM capsules WHERE id = ?`,
      [capsuleId],
    );
    return row ? mapCapsule(row) : null;
  }

  private async getCapsuleByCycle(cycleId: string): Promise<Capsule | null> {
    const row = await this.database.getFirstAsync<CapsuleRow>(
      `SELECT id, cycle_id, contribution_ids_json, status, revealed_at
       FROM capsules WHERE cycle_id = ?`,
      [cycleId],
    );
    return row ? mapCapsule(row) : null;
  }

  private async saveCapsule(capsule: Capsule): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO capsules
        (id, cycle_id, contribution_ids_json, status, revealed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         cycle_id = excluded.cycle_id,
         contribution_ids_json = excluded.contribution_ids_json,
         status = excluded.status,
         revealed_at = excluded.revealed_at`,
      [
        capsule.id,
        capsule.cycleId,
        JSON.stringify(capsule.contributionIds),
        capsule.status,
        capsule.revealedAt,
      ],
    );
  }

  private async getReminder(memberId: string): Promise<ReminderPreference | null> {
    const row = await this.database.getFirstAsync<ReminderRow>(
      `SELECT member_id, enabled, weekday, hour, minute, notification_id
       FROM reminder_preferences WHERE member_id = ?`,
      [memberId],
    );
    return row ? mapReminder(row) : null;
  }

  private async saveReminder(preference: ReminderPreference): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO reminder_preferences
        (member_id, enabled, weekday, hour, minute, notification_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(member_id) DO UPDATE SET
         enabled = excluded.enabled,
         weekday = excluded.weekday,
         hour = excluded.hour,
         minute = excluded.minute,
         notification_id = excluded.notification_id`,
      [
        preference.memberId,
        preference.enabled ? 1 : 0,
        preference.weekday,
        preference.hour,
        preference.minute,
        preference.notificationId,
      ],
    );
  }

  private async appendAuditEvent(event: AuditEvent): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO audit_events (id, type, at, subject_id, metadata_json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         at = excluded.at,
         subject_id = excluded.subject_id,
         metadata_json = excluded.metadata_json`,
      [event.id, event.type, event.at, event.subjectId, JSON.stringify(event.metadata)],
    );
  }

  private async listAuditEvents(subjectId?: string): Promise<readonly AuditEvent[]> {
    const rows = subjectId
      ? await this.database.getAllAsync<AuditRow>(
          `SELECT id, type, at, subject_id, metadata_json
           FROM audit_events WHERE subject_id = ? ORDER BY at, id`,
          [subjectId],
        )
      : await this.database.getAllAsync<AuditRow>(
          `SELECT id, type, at, subject_id, metadata_json
           FROM audit_events ORDER BY at, id`,
        );
    return rows.map(mapAuditEvent);
  }
}

function mapMember(row: MemberRow): Member {
  return {
    avatarSeed: row.avatar_seed,
    displayName: row.display_name,
    id: row.id,
  };
}

function mapCycle(row: CycleRow): Cycle {
  return {
    durationSeconds: row.duration_seconds,
    groupId: row.group_id,
    id: row.id,
    startAt: row.start_at,
    status: row.status,
  };
}

function mapContribution(row: ContributionRow): Contribution {
  return {
    capturedAt: row.captured_at,
    cycleId: row.cycle_id,
    deletedAt: row.deleted_at,
    durationSeconds: row.duration_seconds,
    id: row.id,
    localUri: row.local_uri,
    mediaKind: row.media_kind,
    memberId: row.member_id,
    processingAttempt: row.processing_attempt,
    state: row.state,
    vignetteTreatment: row.vignette_treatment,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    body: row.body,
    createdAt: row.created_at,
    groupId: row.group_id,
    id: row.id,
    memberId: row.member_id,
    replyToId: row.reply_to_id,
  };
}

function mapReaction(row: ReactionRow): Reaction {
  return {
    emoji: row.emoji,
    id: row.id,
    memberId: row.member_id,
    messageId: row.message_id,
  };
}

function mapCapsule(row: CapsuleRow): Capsule {
  return {
    contributionIds: parseStringArray(row.contribution_ids_json),
    cycleId: row.cycle_id,
    id: row.id,
    revealedAt: row.revealed_at,
    status: row.status,
  };
}

function mapReminder(row: ReminderRow): ReminderPreference {
  return {
    enabled: row.enabled === 1,
    hour: row.hour,
    memberId: row.member_id,
    minute: row.minute,
    notificationId: row.notification_id,
    weekday: row.weekday,
  };
}

function mapAuditEvent(row: AuditRow): AuditEvent {
  return {
    at: row.at,
    id: row.id,
    metadata: parseMetadata(row.metadata_json),
    subjectId: row.subject_id,
    type: row.type,
  };
}

function parseStringArray(value: string): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function parseMetadata(value: string): Readonly<Record<string, string | number | boolean | null>> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string | number | boolean | null>;
    }
  } catch {
    // Malformed metadata should not prevent local records from being read.
  }
  return {};
}

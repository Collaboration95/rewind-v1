import {
  seededDomainFixture,
  type DomainFixture,
} from '../../../../packages/domain/src/fixtures.ts';

import type { LocalSqliteDriver } from './local-sqlite';

export async function seedDatabase(
  database: LocalSqliteDriver,
  fixture: DomainFixture = seededDomainFixture,
): Promise<void> {
  await database.withTransactionAsync(() => insertFixture(database, fixture));
}

async function insertFixture(database: LocalSqliteDriver, fixture: DomainFixture): Promise<void> {
  for (const member of fixture.members) {
    await database.runAsync(
      'INSERT OR IGNORE INTO members (id, display_name, avatar_seed) VALUES (?, ?, ?)',
      [member.id, member.displayName, member.avatarSeed],
    );
  }

  await database.runAsync(
    'INSERT OR IGNORE INTO groups (id, name, timezone, prompt) VALUES (?, ?, ?, ?)',
    [fixture.group.id, fixture.group.name, fixture.group.timezone, fixture.group.prompt],
  );

  for (const memberId of fixture.group.memberIds) {
    await database.runAsync(
      'INSERT OR IGNORE INTO group_members (group_id, member_id) VALUES (?, ?)',
      [fixture.group.id, memberId],
    );
  }

  await database.runAsync(
    'INSERT OR IGNORE INTO cycles (id, group_id, start_at, duration_seconds, status) VALUES (?, ?, ?, ?, ?)',
    [
      fixture.cycle.id,
      fixture.cycle.groupId,
      fixture.cycle.startAt,
      fixture.cycle.durationSeconds,
      fixture.cycle.status,
    ],
  );

  for (const contribution of fixture.contributions) {
    await database.runAsync(
      `INSERT OR IGNORE INTO contributions
        (id, cycle_id, member_id, captured_at, media_kind, duration_seconds,
         vignette_treatment, local_uri, state, processing_attempt, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  for (const message of fixture.messages) {
    await database.runAsync(
      'INSERT OR IGNORE INTO messages (id, group_id, member_id, body, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
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

  for (const reaction of fixture.reactions) {
    await database.runAsync(
      'INSERT OR IGNORE INTO reactions (id, message_id, member_id, emoji) VALUES (?, ?, ?, ?)',
      [reaction.id, reaction.messageId, reaction.memberId, reaction.emoji],
    );
  }

  await database.runAsync(
    'INSERT OR IGNORE INTO capsules (id, cycle_id, contribution_ids_json, status, revealed_at) VALUES (?, ?, ?, ?, ?)',
    [
      fixture.capsule.id,
      fixture.capsule.cycleId,
      JSON.stringify(fixture.capsule.contributionIds),
      fixture.capsule.status,
      fixture.capsule.revealedAt,
    ],
  );

  await database.runAsync(
    'INSERT OR IGNORE INTO reminder_preferences (member_id, enabled, weekday, hour, minute, notification_id) VALUES (?, ?, ?, ?, ?, ?)',
    [
      fixture.reminder.memberId,
      fixture.reminder.enabled ? 1 : 0,
      fixture.reminder.weekday,
      fixture.reminder.hour,
      fixture.reminder.minute,
      fixture.reminder.notificationId,
    ],
  );

  await database.runAsync(
    'INSERT OR IGNORE INTO simulation_clock (id, now, mode) VALUES (1, ?, ?)',
    [fixture.clock.now, fixture.clock.mode],
  );

  for (const event of fixture.auditEvents) {
    await database.runAsync(
      'INSERT OR IGNORE INTO audit_events (id, type, at, subject_id, metadata_json) VALUES (?, ?, ?, ?, ?)',
      [event.id, event.type, event.at, event.subjectId, JSON.stringify(event.metadata)],
    );
  }
}

export async function resetDatabaseToSeed(
  database: LocalSqliteDriver,
  fixture: DomainFixture = seededDomainFixture,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.execAsync(`
      DELETE FROM audit_events;
      DELETE FROM reactions;
      DELETE FROM messages;
      DELETE FROM contributions;
      DELETE FROM capsules;
      DELETE FROM reminder_preferences;
      DELETE FROM group_members;
      DELETE FROM cycles;
      DELETE FROM groups;
      DELETE FROM members;
      DELETE FROM simulation_clock;
    `);
    await insertFixture(database, fixture);
  });
}

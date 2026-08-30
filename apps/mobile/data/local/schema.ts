import type { LocalSqliteDriver } from './local-sqlite';

export const DATABASE_NAME = 'rewind-v1.db';
export const LATEST_SCHEMA_VERSION = 1;

export interface Migration {
  readonly version: number;
  readonly statements: readonly string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY NOT NULL,
          display_name TEXT NOT NULL,
          avatar_seed TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          timezone TEXT NOT NULL,
          prompt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_members (
          group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          PRIMARY KEY (group_id, member_id)
        );

        CREATE TABLE IF NOT EXISTS cycles (
          id TEXT PRIMARY KEY NOT NULL,
          group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          start_at TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('collecting', 'reveal_pending', 'premiere', 'delayed', 'archived'))
        );

        CREATE TABLE IF NOT EXISTS contributions (
          id TEXT PRIMARY KEY NOT NULL,
          cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
          member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
          captured_at TEXT NOT NULL,
          media_kind TEXT NOT NULL CHECK (media_kind IN ('photo', 'video')),
          duration_seconds REAL NOT NULL,
          vignette_treatment TEXT NOT NULL CHECK (vignette_treatment IN ('flash', 'ccd', 'home-movie', 'tape')),
          local_uri TEXT,
          state TEXT NOT NULL CHECK (state IN ('recording', 'captured', 'processing', 'locked', 'failed', 'revealed', 'archived', 'deleted')),
          processing_attempt INTEGER NOT NULL DEFAULT 0,
          deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
          body TEXT NOT NULL,
          reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reactions (
          id TEXT PRIMARY KEY NOT NULL,
          message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
          emoji TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS capsules (
          id TEXT PRIMARY KEY NOT NULL,
          cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
          contribution_ids_json TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('premiere', 'archived')),
          revealed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS reminder_preferences (
          member_id TEXT PRIMARY KEY NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
          weekday INTEGER NOT NULL,
          hour INTEGER NOT NULL,
          minute INTEGER NOT NULL,
          notification_id TEXT
        );

        CREATE TABLE IF NOT EXISTS simulation_clock (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          now TEXT NOT NULL,
          mode TEXT NOT NULL CHECK (mode IN ('real', 'demo-minute', 'demo-day', 'demo-cycle'))
        );

        CREATE TABLE IF NOT EXISTS audit_events (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          at TEXT NOT NULL,
          subject_id TEXT NOT NULL,
          metadata_json TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_group_members_member ON group_members(member_id);
        CREATE INDEX IF NOT EXISTS idx_cycles_group_status ON cycles(group_id, status);
        CREATE INDEX IF NOT EXISTS idx_contributions_cycle_captured ON contributions(cycle_id, captured_at);
        CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
        CREATE INDEX IF NOT EXISTS idx_audit_subject_at ON audit_events(subject_id, at);
      `,
    ],
  },
];

export async function migrateDatabase(database: LocalSqliteDriver): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');

  const currentVersionRow = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = Number(currentVersionRow?.user_version ?? 0);

  if (!Number.isInteger(currentVersion) || currentVersion < 0) {
    throw new Error('SQLite schema version is invalid');
  }

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `SQLite schema version ${currentVersion} is newer than supported version ${LATEST_SCHEMA_VERSION}`,
    );
  }

  for (const migration of MIGRATIONS.filter(({ version }) => version > currentVersion)) {
    await database.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await database.execAsync(statement);
      }
      await database.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

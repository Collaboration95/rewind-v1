import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { SQLiteDomainRepository } from '../data/local/repository.ts';
import { LATEST_SCHEMA_VERSION, migrateDatabase } from '../data/local/schema.ts';
import { resetDatabaseToSeed, seedDatabase } from '../data/local/seed.ts';

class NodeSqliteDriver {
  constructor(databasePath) {
    this.database = new DatabaseSync(databasePath);
  }

  async execAsync(source) {
    this.database.exec(source);
  }

  async getAllAsync(source, params = []) {
    return this.database.prepare(source).all(...params);
  }

  async getFirstAsync(source, params = []) {
    return this.database.prepare(source).get(...params) ?? null;
  }

  async runAsync(source, params = []) {
    const result = this.database.prepare(source).run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  async withTransactionAsync(task) {
    this.database.exec('BEGIN');
    try {
      await task();
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

test('migrations, seed, repository reads, relaunch, and reset use real SQLite', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rewind-v1-'));
  const databasePath = join(temporaryDirectory, 'rewind-v1.db');
  let driver = new NodeSqliteDriver(databasePath);

  try {
    await migrateDatabase(driver);
    await seedDatabase(driver);

    assert.equal(
      Number((await driver.getFirstAsync('PRAGMA user_version'))?.user_version),
      LATEST_SCHEMA_VERSION,
    );
    assert.equal(Number((await driver.getFirstAsync('PRAGMA foreign_keys'))?.foreign_keys), 1);

    const repository = new SQLiteDomainRepository(driver);
    const group = await repository.groups.get('group-rewind-demo');
    const members = await repository.members.listByGroup('group-rewind-demo');
    const cycle = await repository.cycles.get('cycle-rewind-demo');
    const collectingCycle = await repository.cycles.getCollecting(
      'group-rewind-demo',
      '2026-08-30T10:00:00.000Z',
    );
    const contributions = await repository.contributions.listByCycle('cycle-rewind-demo');
    const messages = await repository.messages.listByGroup('group-rewind-demo');
    const capsule = await repository.capsules.getByCycle('cycle-rewind-demo');
    const reminder = await repository.reminders.get('member-ava');
    const activeMemberId = await repository.session.getActiveMemberId('group-rewind-demo');

    assert.equal(group?.name, 'The Sunday Room');
    assert.equal(members.length, 5);
    assert.ok(cycle);
    assert.equal(cycle?.status, 'collecting');
    assert.equal(collectingCycle?.id, 'cycle-rewind-demo');
    assert.deepEqual(
      contributions.map(({ mediaKind, durationSeconds }) => ({ mediaKind, durationSeconds })),
      [
        { mediaKind: 'photo', durationSeconds: 3 },
        { mediaKind: 'video', durationSeconds: 5 },
      ],
    );
    assert.equal(messages[0]?.body, 'The light after rain counts.');
    assert.deepEqual(capsule?.contributionIds, [
      'contribution-photo-demo',
      'contribution-video-demo',
    ]);
    assert.equal(reminder?.enabled, false);
    assert.equal(activeMemberId, 'member-ava');

    for (const [table, expectedCount] of [
      ['members', 5],
      ['groups', 1],
      ['group_members', 5],
      ['cycles', 1],
      ['contributions', 2],
      ['messages', 1],
      ['capsules', 1],
      ['reminder_preferences', 1],
      ['simulation_clock', 1],
      ['local_session', 1],
      ['audit_events', 0],
    ]) {
      const row = await driver.getFirstAsync(`SELECT COUNT(*) AS count FROM ${table}`);
      assert.equal(Number(row?.count), expectedCount, `seed count for ${table}`);
    }

    await repository.cycles.save({ ...cycle, status: 'reveal_pending' });
    assert.equal((await repository.contributions.listByCycle('cycle-rewind-demo')).length, 2);
    await repository.session.saveActiveMember('group-rewind-demo', 'member-ben');

    await repository.audit.append({
      id: 'audit-local-edit',
      type: 'local.test',
      at: '2026-08-30T10:30:00.000Z',
      subjectId: 'group-rewind-demo',
      metadata: { source: 'test' },
    });
    assert.equal((await repository.audit.list('group-rewind-demo')).length, 1);

    await driver.runAsync(
      'INSERT INTO messages (id, group_id, member_id, body, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'message-local-edit',
        'group-rewind-demo',
        'member-ava',
        'A persisted local note.',
        null,
        '2026-08-30T11:00:00.000Z',
      ],
    );

    // A close/reopen on the same file exercises actual relaunch persistence.
    driver.close();
    driver = new NodeSqliteDriver(databasePath);
    await migrateDatabase(driver);
    await seedDatabase(driver);
    const relaunchedRepository = new SQLiteDomainRepository(driver);
    assert.equal((await relaunchedRepository.messages.listByGroup('group-rewind-demo')).length, 2);
    assert.equal((await relaunchedRepository.audit.list('group-rewind-demo')).length, 1);
    assert.equal(
      (await relaunchedRepository.cycles.get('cycle-rewind-demo'))?.status,
      'reveal_pending',
    );
    assert.equal(
      await relaunchedRepository.session.getActiveMemberId('group-rewind-demo'),
      'member-ben',
    );

    await resetDatabaseToSeed(driver);
    assert.equal((await relaunchedRepository.messages.listByGroup('group-rewind-demo')).length, 1);
    assert.equal((await relaunchedRepository.members.listByGroup('group-rewind-demo')).length, 5);
    assert.equal((await relaunchedRepository.audit.list('group-rewind-demo')).length, 0);
    assert.equal(
      (await relaunchedRepository.cycles.get('cycle-rewind-demo'))?.status,
      'collecting',
    );
    assert.equal(
      await relaunchedRepository.session.getActiveMemberId('group-rewind-demo'),
      'member-ava',
    );
  } finally {
    driver.close();
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test('schema has no blob, credential, or remote-media columns', async () => {
  const driver = new NodeSqliteDriver(':memory:');
  try {
    await migrateDatabase(driver);

    const rows = await driver.getAllAsync(
      `SELECT name, sql FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    );
    const schema = rows.map(({ name, sql }) => `${name} ${sql}`).join('\n');

    assert.doesNotMatch(schema, /blob|password|token|secret|credential|remote|https?:\/\//i);
    assert.match(schema, /local_uri TEXT/);
    assert.match(schema, /metadata_json TEXT/);
  } finally {
    driver.close();
  }
});

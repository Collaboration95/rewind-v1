import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { getContributionBudget } from '../../../packages/domain/src/policy/index.ts';
import { SQLiteDomainRepository } from '../data/local/repository.ts';
import { migrateDatabase } from '../data/local/schema.ts';
import { seedDatabase } from '../data/local/seed.ts';
import { createLocalContributionReviewStore } from '../features/capture/local-contribution-review-store.ts';

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

function localFiles() {
  return {
    copyFromCache: async (_sourceUri, destinationName) => ({
      uri: `file:///documents/rewind-captures/${destinationName}`,
    }),
    exists: async () => true,
    remove: async () => undefined,
  };
}

test('review lock and quota survive a real SQLite close and relaunch', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rewind-v1-review-'));
  const databasePath = join(temporaryDirectory, 'rewind-v1.db');
  let driver = new NodeSqliteDriver(databasePath);
  const candidate = {
    capturedAt: '2026-08-30T10:30:00.000Z',
    cycleId: 'cycle-rewind-demo',
    deletedAt: null,
    durationSeconds: 5,
    id: 'contribution-relaunch-lock',
    localUri: 'file:///documents/rewind-captures/contribution-relaunch-lock.mov',
    mediaKind: 'video',
    memberId: 'member-ava',
    processingAttempt: 0,
    state: 'captured',
    vignetteTreatment: 'flash',
  };

  try {
    await migrateDatabase(driver);
    await seedDatabase(driver);
    let repository = new SQLiteDomainRepository(driver);
    await repository.contributions.save(candidate);

    let auditSequence = 0;
    const store = createLocalContributionReviewStore({
      files: localFiles(),
      nextAuditId: (action, contributionId) =>
        `sqlite-${action}-${contributionId}-${++auditSequence}`,
      now: () => '2026-08-30T11:00:00.000Z',
      repository,
    });

    assert.deepEqual((await store.load()).review, {
      capturedAt: candidate.capturedAt,
      durationSeconds: candidate.durationSeconds,
      fileStatus: 'stored',
      id: candidate.id,
      mediaKind: candidate.mediaKind,
      processingAttempt: 0,
      state: 'captured',
      vignetteTreatment: candidate.vignetteTreatment,
    });
    const processing = await store.startProcessing(candidate.id);
    assert.equal(processing.accepted, true);
    assert.equal(processing.review.state, 'processing');
    const locked = await store.completeProcessing(candidate.id);
    assert.equal(locked.accepted, true);
    assert.equal(locked.review.state, 'locked');
    assert.deepEqual((await repository.audit.list(candidate.id)).map(({ type }) => type).sort(), [
      'policy.processing.completed',
      'policy.processing.started',
      'policy.submission.validated',
    ]);

    driver.close();
    driver = new NodeSqliteDriver(databasePath);
    await migrateDatabase(driver);
    await seedDatabase(driver);
    repository = new SQLiteDomainRepository(driver);
    const relaunchedStore = createLocalContributionReviewStore({
      files: localFiles(),
      now: () => '2026-08-30T12:00:00.000Z',
      repository,
    });
    const relaunched = await relaunchedStore.load();
    assert.equal(relaunched.review?.id, candidate.id);
    assert.equal(relaunched.review?.state, 'locked');
    assert.equal(relaunched.review?.processingAttempt, 1);

    const contributions = await repository.contributions.listByCycle(candidate.cycleId);
    assert.deepEqual(getContributionBudget(contributions, candidate.memberId, candidate.cycleId), {
      remainingCount: 3,
      remainingDurationSeconds: 22,
      usedCount: 2,
      usedDurationSeconds: 8,
    });
  } finally {
    driver.close();
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

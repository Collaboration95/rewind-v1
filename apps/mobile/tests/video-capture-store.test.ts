import { describe, expect, it, jest } from '@jest/globals';

import {
  seededContributions,
  seededCycle,
  seededGroup,
} from '../../../packages/domain/src/fixtures';
import type { AuditEvent, Contribution } from '../../../packages/domain/src/models';
import type { LocalMediaFilePort } from '../platform/files/storage';
import {
  createLocalVideoCaptureStore,
  type LocalVideoCaptureRepository,
} from '../features/capture/local-video-capture-store';

function createHarness(saveContribution?: (contribution: Contribution) => Promise<void>) {
  const savedContributions: Contribution[] = [];
  const auditEvents: AuditEvent[] = [];
  const files: LocalMediaFilePort = {
    copyFromCache: jest.fn(async (_sourceUri, destinationName) => ({
      uri: `file:///documents/rewind-captures/${destinationName}`,
    })),
    exists: jest.fn(async () => true),
    remove: jest.fn(async () => undefined),
  };
  const repository: LocalVideoCaptureRepository = {
    audit: {
      append: jest.fn(async (event: AuditEvent) => {
        auditEvents.push(event);
      }),
    },
    contributions: {
      listByCycle: jest.fn(async () => [...seededContributions, ...savedContributions]),
      save: jest.fn(async (contribution: Contribution) => {
        if (saveContribution) {
          await saveContribution(contribution);
        }
        savedContributions.push(contribution);
      }),
    },
    cycles: {
      getCollecting: jest.fn(async () => seededCycle),
    },
    groups: {
      get: jest.fn(async () => seededGroup),
    },
    session: {
      getActiveMemberId: jest.fn(async () => 'member-ava'),
    },
  };

  const store = createLocalVideoCaptureStore({
    files,
    nextId: () => 'contribution-video-test',
    repository,
  });

  return { auditEvents, files, repository, savedContributions, store };
}

describe('Local video capture persistence boundary', () => {
  it('validates policy, copies the cache file, and persists metadata with the durable URI', async () => {
    const { auditEvents, files, repository, savedContributions, store } = createHarness();

    const outcome = await store.save({
      capturedAt: '2026-08-30T10:30:00.000Z',
      durationSeconds: 2,
      sourceUri: 'file:///cache/synthetic-video.mov',
      vignetteTreatment: 'flash',
    });

    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) {
      return;
    }
    expect(files.copyFromCache).toHaveBeenCalledWith(
      'file:///cache/synthetic-video.mov',
      'contribution-video-test.mov',
    );
    expect(outcome.value.localUri).toBe(
      'file:///documents/rewind-captures/contribution-video-test.mov',
    );
    expect(savedContributions).toEqual([outcome.value]);
    expect(repository.contributions.save).toHaveBeenCalledTimes(1);
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.metadata).not.toHaveProperty('localUri');
  });

  it('rejects an over-limit video before copying or persisting a file', async () => {
    const { files, repository, savedContributions, store } = createHarness();

    const outcome = await store.save({
      capturedAt: '2026-08-30T10:30:00.000Z',
      durationSeconds: 16,
      sourceUri: 'file:///cache/too-long.mov',
      vignetteTreatment: 'flash',
    });

    expect(outcome.accepted).toBe(false);
    if (outcome.accepted) {
      return;
    }
    expect(outcome.code).toBe('video-duration-out-of-range');
    expect(files.copyFromCache).not.toHaveBeenCalled();
    expect(repository.contributions.save).not.toHaveBeenCalled();
    expect(savedContributions).toHaveLength(0);
  });

  it('removes a copied file if metadata persistence fails', async () => {
    const { files, store } = createHarness(async () => {
      throw new Error('synthetic database failure');
    });

    await expect(
      store.save({
        capturedAt: '2026-08-30T10:30:00.000Z',
        durationSeconds: 2,
        sourceUri: 'file:///cache/synthetic-video.mp4',
        vignetteTreatment: 'ccd',
      }),
    ).rejects.toThrow('synthetic database failure');
    expect(files.remove).toHaveBeenCalledWith(
      'file:///documents/rewind-captures/contribution-video-test.mp4',
    );
  });

  it('rejects a copy that is not addressable and removes the partial file', async () => {
    const { files, store } = createHarness();
    jest.spyOn(files, 'exists').mockResolvedValue(false);

    await expect(
      store.save({
        capturedAt: '2026-08-30T10:30:00.000Z',
        durationSeconds: 2,
        sourceUri: 'file:///cache/unaddressable-video.mp4',
        vignetteTreatment: 'tape',
      }),
    ).rejects.toThrow('not copied durably');
    expect(files.remove).toHaveBeenCalledWith(
      'file:///documents/rewind-captures/contribution-video-test.mp4',
    );
  });
});

import { describe, expect, it, jest } from '@jest/globals';

import {
  seededContributions,
  seededCycle,
  seededGroup,
  seededMembers,
} from '../../../packages/domain/src/fixtures';
import { createLocalHomeStore, type LocalHomeRepository } from '../features/group/local-home';

function createRepository(overrides: Partial<LocalHomeRepository> = {}): LocalHomeRepository {
  return {
    contributions: {
      listByCycle: jest.fn(async () => seededContributions),
    },
    cycles: {
      get: jest.fn(async () => seededCycle),
      getCollecting: jest.fn(async () => seededCycle),
    },
    groups: {
      get: jest.fn(async () => seededGroup),
    },
    members: {
      listByGroup: jest.fn(async () => seededMembers),
    },
    session: {
      getActiveMemberId: jest.fn(async () => 'member-ava'),
    },
    ...overrides,
  };
}

describe('Local group home store', () => {
  it('returns quota and lock-safe summaries without local media locators', async () => {
    const store = createLocalHomeStore({
      now: () => '2026-08-30T10:00:00.000Z',
      repository: createRepository(),
    });

    const snapshot = await store.load();

    expect(snapshot.group.name).toBe('The Sunday Room');
    expect(snapshot.activeMember?.displayName).toBe('Ava');
    expect(snapshot.budget).toMatchObject({
      remainingCount: 4,
      remainingDurationSeconds: 27,
      usedCount: 1,
      usedDurationSeconds: 3,
    });
    expect(snapshot.contributions).toHaveLength(2);
    expect(snapshot.contributions[0]).not.toHaveProperty('localUri');
    expect(snapshot.contributions[1]).not.toHaveProperty('localUri');
  });

  it('returns an empty policy-safe state when no cycle is available', async () => {
    const store = createLocalHomeStore({
      repository: createRepository({
        cycles: {
          get: jest.fn(async () => null),
          getCollecting: jest.fn(async () => null),
        },
      }),
    });

    const snapshot = await store.load();

    expect(snapshot.cycle).toBeNull();
    expect(snapshot.budget).toBeNull();
    expect(snapshot.contributions).toEqual([]);
  });
});

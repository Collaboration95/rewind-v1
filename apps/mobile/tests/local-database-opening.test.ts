import { describe, expect, it, jest } from '@jest/globals';

import type * as DatabaseModule from '../data/local/database';

const mockOpenDatabaseAsync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: mockOpenDatabaseAsync,
}));

function createDatabase() {
  return {
    execAsync: jest.fn(async () => undefined),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async (source: string) =>
      source.includes('PRAGMA user_version') ? { user_version: 3 } : null,
    ),
    runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  };
}

describe('local database opening', () => {
  it('shares one migration and seed operation across concurrent callers', async () => {
    jest.resetModules();
    jest.doMock('expo-sqlite', () => ({
      openDatabaseAsync: mockOpenDatabaseAsync,
    }));

    let resolveDatabase!: (database: ReturnType<typeof createDatabase>) => void;
    mockOpenDatabaseAsync.mockImplementation(
      () => new Promise((resolve) => (resolveDatabase = resolve)),
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { openLocalDatabase } = require('../data/local/database') as typeof DatabaseModule;
    const firstOpening = openLocalDatabase('concurrent-test.db');
    const secondOpening = openLocalDatabase('concurrent-test.db');

    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);

    resolveDatabase(createDatabase());
    const [firstHandle, secondHandle] = await Promise.all([firstOpening, secondOpening]);

    expect(firstHandle).toBe(secondHandle);
  });
});

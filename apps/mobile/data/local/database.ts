import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { SQLiteDomainRepository } from './repository';
import { DATABASE_NAME, migrateDatabase } from './schema';
import { resetDatabaseToSeed, seedDatabase } from './seed';
import { createExpoSqliteDriver } from './local-sqlite';

export interface LocalDatabaseHandle {
  readonly database: SQLiteDatabase;
  readonly repository: SQLiteDomainRepository;
  readonly resetToSeed: () => Promise<void>;
}

const openingDatabases = new Map<string, Promise<LocalDatabaseHandle>>();

export function openLocalDatabase(
  databaseName: string = DATABASE_NAME,
): Promise<LocalDatabaseHandle> {
  const existingOpening = openingDatabases.get(databaseName);
  if (existingOpening) {
    return existingOpening;
  }

  const opening = openLocalDatabaseUncached(databaseName).catch((error) => {
    openingDatabases.delete(databaseName);
    throw error;
  });
  openingDatabases.set(databaseName, opening);
  return opening;
}

async function openLocalDatabaseUncached(
  databaseName: string = DATABASE_NAME,
): Promise<LocalDatabaseHandle> {
  const database = await openDatabaseAsync(databaseName);
  const driver = createExpoSqliteDriver(database);

  await migrateDatabase(driver);
  await seedDatabase(driver);

  return {
    database,
    repository: new SQLiteDomainRepository(driver),
    resetToSeed: () => resetDatabaseToSeed(driver),
  };
}

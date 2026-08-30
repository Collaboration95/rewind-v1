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

export async function openLocalDatabase(
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

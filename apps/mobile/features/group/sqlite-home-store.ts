import { openLocalDatabase } from '../../data/local/database';

import { createLocalHomeStore } from './local-home';

export async function createSqliteLocalHomeStore() {
  const database = await openLocalDatabase();
  return createLocalHomeStore({ repository: database.repository });
}

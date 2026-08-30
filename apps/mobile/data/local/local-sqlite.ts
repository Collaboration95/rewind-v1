import type { SQLiteBindValue, SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

export type LocalSqliteParam = SQLiteBindValue;

export interface LocalSqliteDriver {
  execAsync(source: string): Promise<void>;
  getAllAsync<T>(source: string, params?: readonly LocalSqliteParam[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: readonly LocalSqliteParam[]): Promise<T | null>;
  runAsync(source: string, params?: readonly LocalSqliteParam[]): Promise<SQLiteRunResult>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export function createExpoSqliteDriver(database: SQLiteDatabase): LocalSqliteDriver {
  const bind = (params: readonly LocalSqliteParam[] = []) => [...params] as SQLiteBindValue[];

  return {
    execAsync: (source: string) => database.execAsync(source),
    getAllAsync: <T>(source: string, params = []) => database.getAllAsync<T>(source, bind(params)),
    getFirstAsync: <T>(source: string, params = []) =>
      database.getFirstAsync<T>(source, bind(params)),
    runAsync: (source: string, params = []) => database.runAsync(source, bind(params)),
    withTransactionAsync: (task) => database.withTransactionAsync(task),
  };
}

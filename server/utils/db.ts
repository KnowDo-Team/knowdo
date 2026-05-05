import { ensureDbConnection, getDb, initDb } from '../database/client'
import type { Database } from '../database/client'

export type Db = Database

export async function useDb(): Promise<Db> {
  await initDb()
  await ensureDbConnection()
  return getDb()
}

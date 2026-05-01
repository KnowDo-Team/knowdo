import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

function resolveUrl(): string {
  const fromEnv = process.env.DATABASE_URL
  if (fromEnv) return fromEnv
  const filePath = join(process.cwd(), 'storage', 'database', 'knowdo.db')
  mkdirSync(dirname(filePath), { recursive: true })
  return pathToFileURL(filePath).href
}

const url = resolveUrl()

const SQLITE_CLIENT_KEY = '__knowdoSqliteClient'
const SQLITE_DB_KEY = '__knowdoSqliteDb'

export let client: ReturnType<typeof createClient> | undefined
export let db!: LibSQLDatabase<typeof schema>

export async function initDb() {
  if (db && client) return

  const globalState = globalThis as Record<string, unknown>
  if (globalState[SQLITE_CLIENT_KEY] && globalState[SQLITE_DB_KEY]) {
    client = globalState[SQLITE_CLIENT_KEY] as ReturnType<typeof createClient>
    db = globalState[SQLITE_DB_KEY] as LibSQLDatabase<typeof schema>
    return
  }

  const sqliteClient = createClient({ url })
  client = sqliteClient
  db = drizzle(sqliteClient, { schema })

  globalState[SQLITE_CLIENT_KEY] = client
  globalState[SQLITE_DB_KEY] = db
}

export async function ensureDbConnection() {
  await initDb()
  await client!.execute({ sql: 'SELECT 1', args: [] })
}

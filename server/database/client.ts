import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

type DbType = 'sqlite' | 'mysql' | 'pgsql'
export type Database = LibSQLDatabase<typeof schema>
type SqliteClient = { execute: (query: { sql: string, args: [] }) => Promise<unknown> }
type SqlClient = { query: (sql: string) => Promise<unknown>, end: () => Promise<unknown> }
type DbClient = SqliteClient | SqlClient

const rawType = process.env.DB_TYPE || 'sqlite'
const type = normalizeDbType(rawType)
const url = resolveUrl(type)

const MYSQL_POOL_KEY = '__knowdoMysqlPool'
const MYSQL_DB_KEY = '__knowdoMysqlDb'
const PG_POOL_KEY = '__knowdoPgPool'
const PG_DB_KEY = '__knowdoPgDb'
const SQLITE_CLIENT_KEY = '__knowdoSqliteClient'
const SQLITE_DB_KEY = '__knowdoSqliteDb'

let client: DbClient | undefined
let db: Database | undefined

let mysqlReconnectPromise: Promise<void> | null = null
let pgReconnectPromise: Promise<void> | null = null

function normalizeDbType(value: string): DbType {
  if (value === 'mysql') return 'mysql'
  if (['pgsql', 'postgres', 'postgresql'].includes(value)) return 'pgsql'
  return 'sqlite'
}

function resolveUrl(dbType: DbType): string {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    if (dbType === 'mysql' && !databaseUrl.startsWith('mysql://')) {
      throw new Error('DATABASE_URL must start with mysql:// when DB_TYPE=mysql')
    }

    if (dbType === 'pgsql' && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
      throw new Error('DATABASE_URL must start with postgres:// or postgresql:// when DB_TYPE=pgsql')
    }

    return databaseUrl
  }

  if (dbType !== 'sqlite') {
    throw new Error('DATABASE_URL is required when DB_TYPE is mysql or pgsql')
  }

  const filePath = join(process.cwd(), 'storage', 'database', 'knowdo.db')
  mkdirSync(dirname(filePath), { recursive: true })
  return pathToFileURL(filePath).href
}

function isRecoverableConnectionError(error: unknown) {
  const maybeError = error as { code?: unknown, message?: unknown }
  const code = String(maybeError.code || '')
  const recoverableCodes = [
    'PROTOCOL_CONNECTION_LOST',
    'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
    'PROTOCOL_ENQUEUE_AFTER_QUIT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE'
  ]

  if (recoverableCodes.includes(code)) {
    return true
  }

  const message = String(maybeError.message || '')
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|PROTOCOL_CONNECTION_LOST|socket hang up|connection.*closed|pool is closed/i.test(message)
}

async function createMysqlPoolAndDb(): Promise<{ pool: SqlClient, drizzleDb: Database }> {
  const { drizzle: drizzleMysql } = await import('drizzle-orm/mysql2')
  const mysqlImport = await import('mysql2/promise')
  const mysql = mysqlImport.default || mysqlImport

  const parsed = new URL(url)
  const pool = mysql.createPool({
    uri: url,
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10_000
  })

  return {
    pool,
    drizzleDb: drizzleMysql(pool, { schema, mode: 'default' }) as unknown as Database
  }
}

async function createPgPoolAndDb(): Promise<{ pool: SqlClient, drizzleDb: Database }> {
  const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres')
  const { Pool } = await import('pg')

  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 10_000
  })

  return {
    pool,
    drizzleDb: drizzlePg(pool, { schema }) as unknown as Database
  }
}

async function createSqliteClientAndDb(): Promise<{ sqliteClient: SqliteClient, drizzleDb: Database }> {
  const { createClient } = await import('@libsql/client')
  const { drizzle: drizzleLibsql } = await import('drizzle-orm/libsql')

  const sqliteClient = createClient({ url })

  return {
    sqliteClient,
    drizzleDb: drizzleLibsql(sqliteClient, { schema }) as Database
  }
}

export async function initDb() {
  if (db && client) return

  const globalState = globalThis as typeof globalThis & Record<string, unknown>

  if (type === 'mysql') {
    if (globalState[MYSQL_POOL_KEY] && globalState[MYSQL_DB_KEY]) {
      client = globalState[MYSQL_POOL_KEY] as DbClient
      db = globalState[MYSQL_DB_KEY] as Database
      return
    }

    const { pool, drizzleDb } = await createMysqlPoolAndDb()

    client = pool
    db = drizzleDb

    globalState[MYSQL_POOL_KEY] = client
    globalState[MYSQL_DB_KEY] = db
    return
  }

  if (type === 'pgsql') {
    if (globalState[PG_POOL_KEY] && globalState[PG_DB_KEY]) {
      client = globalState[PG_POOL_KEY] as DbClient
      db = globalState[PG_DB_KEY] as Database
      return
    }

    const { pool, drizzleDb } = await createPgPoolAndDb()

    client = pool
    db = drizzleDb

    globalState[PG_POOL_KEY] = client
    globalState[PG_DB_KEY] = db
    return
  }

  if (globalState[SQLITE_CLIENT_KEY] && globalState[SQLITE_DB_KEY]) {
    client = globalState[SQLITE_CLIENT_KEY] as DbClient
    db = globalState[SQLITE_DB_KEY] as Database
    return
  }

  const { sqliteClient, drizzleDb } = await createSqliteClientAndDb()

  client = sqliteClient
  db = drizzleDb

  globalState[SQLITE_CLIENT_KEY] = client
  globalState[SQLITE_DB_KEY] = db
}

export async function ensureDbConnection() {
  await initDb()

  if (!client) {
    throw new Error('Database client is not initialized')
  }

  if (type === 'sqlite') {
    await (client as SqliteClient).execute({ sql: 'SELECT 1', args: [] })
    return
  }

  try {
    await (client as SqlClient).query('SELECT 1')
  } catch (error: unknown) {
    if (!isRecoverableConnectionError(error)) {
      throw error
    }

    if (type === 'mysql') {
      if (!mysqlReconnectPromise) {
        mysqlReconnectPromise = reconnectMysql().finally(() => {
          mysqlReconnectPromise = null
        })
      }

      await mysqlReconnectPromise
      await (client as SqlClient).query('SELECT 1')
      return
    }

    if (!pgReconnectPromise) {
      pgReconnectPromise = reconnectPg().finally(() => {
        pgReconnectPromise = null
      })
    }

    await pgReconnectPromise
    await (client as SqlClient).query('SELECT 1')
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database is not initialized')
  }

  return db
}

async function reconnectMysql() {
  try {
    await (client as SqlClient | undefined)?.end?.()
  } catch {
    // Ignore close errors before reconnecting.
  }

  const { pool, drizzleDb } = await createMysqlPoolAndDb()
  const globalState = globalThis as typeof globalThis & Record<string, unknown>

  client = pool
  db = drizzleDb

  globalState[MYSQL_POOL_KEY] = client
  globalState[MYSQL_DB_KEY] = db
}

async function reconnectPg() {
  try {
    await (client as SqlClient | undefined)?.end?.()
  } catch {
    // Ignore close errors before reconnecting.
  }

  const { pool, drizzleDb } = await createPgPoolAndDb()
  const globalState = globalThis as typeof globalThis & Record<string, unknown>

  client = pool
  db = drizzleDb

  globalState[PG_POOL_KEY] = client
  globalState[PG_DB_KEY] = db
}

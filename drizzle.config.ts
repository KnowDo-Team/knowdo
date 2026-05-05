import { defineConfig } from 'drizzle-kit'

const dbType = process.env.DB_TYPE || 'sqlite'

function getDialect() {
  if (dbType === 'mysql') return 'mysql'
  if (['pgsql', 'postgres', 'postgresql'].includes(dbType)) return 'postgresql'
  return 'sqlite'
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  if (dbType !== 'sqlite') {
    throw new Error('DATABASE_URL is required when DB_TYPE is mysql or pgsql')
  }

  return 'file:./storage/database/knowdo.db'
}

export default defineConfig({
  schema: './server/database/schema.ts',
  out: `./server/database/migrations/${dbType}`,
  dialect: getDialect(),
  dbCredentials: {
    url: getDatabaseUrl()
  }
})

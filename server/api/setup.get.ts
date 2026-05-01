import { count } from 'drizzle-orm'
import { users } from '../database/schema'
import { useDb } from '../utils/db'

export default defineEventHandler(async () => {
  const db = await useDb()
  const [row] = await db.select({ n: count() }).from(users)
  const n = Number(row?.n ?? 0)
  return { needsSetup: n === 0 }
})

import { randomUUID } from 'node:crypto'
import { count } from 'drizzle-orm'
import { users } from '../database/schema'
import { hashPassword } from '../utils/auth'
import { useDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const db = await useDb()
  const [row] = await db.select({ n: count() }).from(users)
  if (Number(row?.n ?? 0) > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Setup already completed' })
  }

  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = body.username?.trim()
  const password = body.password || ''
  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'username and password required' })
  }

  const id = randomUUID()
  await db.insert(users).values({
    id,
    username,
    role: 'superadmin',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  })

  return { success: true }
})

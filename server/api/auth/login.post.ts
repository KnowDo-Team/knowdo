import { eq } from 'drizzle-orm'
import { sessions, users } from '../../database/schema'
import { createSession, hashPassword, setSessionCookie } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = body.username?.trim()
  const password = body.password || ''
  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password required' })
  }

  const db = await useDb()
  const userRows = await db.select().from(users).where(eq(users.username, username)).limit(1)
  const user = userRows[0]
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }

  const rawToken = await createSession(user.id)
  await setSessionCookie(event, rawToken)

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
})

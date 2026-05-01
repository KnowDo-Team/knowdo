import { eq } from 'drizzle-orm'
import { getCookie } from 'h3'
import { sessions } from '../../database/schema'
import { clearSessionCookie, hashPassword, SESSION_COOKIE } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    const db = await useDb()
    const tokenHash = hashPassword(token)
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  }
  await clearSessionCookie(event)
  return { success: true }
})

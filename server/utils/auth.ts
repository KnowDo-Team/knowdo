import { createHash, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie, deleteCookie } from 'h3'
import { sessions, users } from '../database/schema'
import { useDb } from './db'

export const SESSION_COOKIE = 'knowdo_session'

export function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export async function getCurrentUser(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const db = await useDb()
  const tokenHash = hashPassword(token)
  const sessionRows = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1)
  const session = sessionRows[0]
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return null
  }

  const userRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  return userRows[0] ?? null
}

export async function setSessionCookie(event: H3Event, rawToken: string) {
  setCookie(event, SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })
}

export async function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function createSession(userId: string): Promise<string> {
  const db = await useDb()
  const rawToken = randomUUID()
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashPassword(rawToken),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString()
  })
  return rawToken
}

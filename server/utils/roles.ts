import type { H3Event } from 'h3'
import { createError } from 'h3'
import { getCurrentUser } from './auth'

export type Role = 'superadmin' | 'admin' | 'editor'

export function isStaffRole(role: string): role is Role {
  return role === 'superadmin' || role === 'admin' || role === 'editor'
}

export function canAccessAdmin(role: string) {
  return isStaffRole(role)
}

/** Admin API: superadmin + admin */
export async function requireAdmin(event: H3Event) {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

/** Any staff including editor */
export async function requireStaff(event: H3Event) {
  const user = await getCurrentUser(event)
  if (!user || !isStaffRole(user.role)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}

export async function requireSuperadmin(event: H3Event) {
  const user = await getCurrentUser(event)
  if (!user || user.role !== 'superadmin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

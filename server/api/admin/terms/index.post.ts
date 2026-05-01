import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { terms } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody<{ parentId?: string | null; slug?: string; name?: string }>(event)
  const slug = body.slug?.trim() || ''
  const name = body.name?.trim() || ''
  const parentId = body.parentId && body.parentId.length > 0 ? body.parentId : null

  if (!slug || !name) {
    throw createError({ statusCode: 400, statusMessage: 'slug and name required' })
  }

  const db = await useDb()
  const dup = parentId === null
    ? await db
        .select()
        .from(terms)
        .where(and(eq(terms.slug, slug), isNull(terms.parentId)))
        .limit(1)
    : await db
        .select()
        .from(terms)
        .where(and(eq(terms.slug, slug), eq(terms.parentId, parentId)))
        .limit(1)

  if (dup[0]) {
    throw createError({ statusCode: 409, statusMessage: 'slug_conflict_same_parent' })
  }

  const id = randomUUID()
  await db.insert(terms).values({
    id,
    parentId,
    slug,
    name,
    createdAt: new Date().toISOString()
  })

  return { success: true, term: { id, parentId, slug, name } }
})

import { and, eq, isNull, ne } from 'drizzle-orm'
import { terms } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ parentId?: string | null; slug?: string; name?: string }>(event)

  const db = await useDb()
  const [existing] = await db.select().from(terms).where(eq(terms.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const parentId =
    body.parentId === undefined
      ? existing.parentId
      : body.parentId && body.parentId.length > 0
        ? body.parentId
        : null

  const slug = body.slug !== undefined ? body.slug.trim() : existing.slug
  const name = body.name !== undefined ? body.name.trim() : existing.name

  if (!slug || !name) {
    throw createError({ statusCode: 400, statusMessage: 'invalid slug or name' })
  }

  const dup = parentId === null
    ? await db
        .select()
        .from(terms)
        .where(and(eq(terms.slug, slug), isNull(terms.parentId), ne(terms.id, id)))
        .limit(1)
    : await db
        .select()
        .from(terms)
        .where(and(eq(terms.slug, slug), eq(terms.parentId, parentId), ne(terms.id, id)))
        .limit(1)

  if (dup[0]) {
    throw createError({ statusCode: 409, statusMessage: 'slug_conflict_same_parent' })
  }

  await db
    .update(terms)
    .set({ parentId, slug, name })
    .where(eq(terms.id, id))

  return { success: true }
})

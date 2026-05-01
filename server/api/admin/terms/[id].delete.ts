import { eq } from 'drizzle-orm'
import { articleTerms, terms } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const id = getRouterParam(event, 'id') || ''
  const db = await useDb()

  const children = await db.select().from(terms).where(eq(terms.parentId, id))
  if (children.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'delete_children_first' })
  }

  await db.delete(articleTerms).where(eq(articleTerms.termId, id))
  await db.delete(terms).where(eq(terms.id, id))

  return { success: true }
})

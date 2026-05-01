import { eq } from 'drizzle-orm'
import { articleTerms, articles } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const id = getRouterParam(event, 'id') || ''
  const db = await useDb()
  await db.delete(articleTerms).where(eq(articleTerms.articleId, id))
  await db.delete(articles).where(eq(articles.id, id))
  return { success: true }
})

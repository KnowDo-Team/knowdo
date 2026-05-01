import { desc } from 'drizzle-orm'
import { articles } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const db = await useDb()
  const rows = await db.select().from(articles).orderBy(desc(articles.updatedAt))
  return {
    articles: rows.map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      visibility: a.visibility,
      status: a.status,
      updatedAt: a.updatedAt
    }))
  }
})

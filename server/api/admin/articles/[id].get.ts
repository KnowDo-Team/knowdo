import { eq } from 'drizzle-orm'
import { articleTerms, articles } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const id = getRouterParam(event, 'id') || ''
  const db = await useDb()
  const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const links = await db.select({ termId: articleTerms.termId }).from(articleTerms).where(eq(articleTerms.articleId, id))
  let content: unknown
  try {
    content = JSON.parse(row.content)
  } catch {
    content = row.content
  }

  return {
    article: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      content,
      visibility: row.visibility,
      status: row.status,
      termIds: links.map(l => l.termId),
      updatedAt: row.updatedAt
    }
  }
})

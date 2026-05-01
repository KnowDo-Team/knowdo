import { eq } from 'drizzle-orm'
import { articles } from '../../../database/schema'
import { getCurrentUser } from '../../../utils/auth'
import { isStaffRole } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.trim() || ''
  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const db = await useDb()
  const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)
  const article = rows[0]
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  if (article.status !== 'published') {
    const user = await getCurrentUser(event)
    if (!user || !isStaffRole(user.role)) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
  }

  if (article.visibility === 'private') {
    const user = await getCurrentUser(event)
    if (!user || !isStaffRole(user.role)) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
  }

  let content: unknown
  try {
    content = JSON.parse(article.content)
  } catch {
    content = article.content
  }

  return {
    article: {
      id: article.id,
      slug: article.slug,
      title: article.title,
      content,
      visibility: article.visibility,
      status: article.status,
      updatedAt: article.updatedAt
    }
  }
})

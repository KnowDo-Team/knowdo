import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { articleTerms, articles, terms } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'
import { isReservedArticleSlug } from '~~/shared/reservedSlugs'

function serializeContent(content: unknown): string {
  if (typeof content === 'string') return content
  return JSON.stringify(content ?? {})
}

export default defineEventHandler(async (event) => {
  const user = await requireStaff(event)
  const body = await readBody<{
    slug?: string
    title?: string
    content?: unknown
    visibility?: 'public' | 'private'
    status?: 'draft' | 'published'
    termIds?: string[]
  }>(event)

  const slug = body.slug?.trim() || ''
  const title = body.title?.trim() || ''
  if (!slug || !title) {
    throw createError({ statusCode: 400, statusMessage: 'slug and title required' })
  }
  if (isReservedArticleSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'reserved_slug' })
  }

  const visibility = body.visibility === 'private' ? 'private' : 'public'
  const status = body.status === 'published' ? 'published' : 'draft'

  const db = await useDb()
  const [dup] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)
  if (dup) {
    throw createError({ statusCode: 409, statusMessage: 'slug_exists' })
  }

  const termIds = Array.isArray(body.termIds) ? body.termIds.filter(Boolean) : []
  for (const tid of termIds) {
    const [t] = await db.select().from(terms).where(eq(terms.id, tid)).limit(1)
    if (!t) {
      throw createError({ statusCode: 400, statusMessage: 'invalid_term' })
    }
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  await db.insert(articles).values({
    id,
    slug,
    title,
    content: serializeContent(body.content),
    visibility,
    status,
    authorId: user.id,
    createdAt: now,
    updatedAt: now
  })

  for (const tid of termIds) {
    await db.insert(articleTerms).values({ articleId: id, termId: tid })
  }

  return { success: true, id }
})

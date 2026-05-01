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
  await requireStaff(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{
    slug?: string
    title?: string
    content?: unknown
    visibility?: 'public' | 'private'
    status?: 'draft' | 'published'
    termIds?: string[]
  }>(event)

  const db = await useDb()
  const [existing] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const slug = body.slug !== undefined ? body.slug.trim() : existing.slug
  const title = body.title !== undefined ? body.title.trim() : existing.title
  if (!slug || !title) {
    throw createError({ statusCode: 400, statusMessage: 'invalid slug or title' })
  }
  if (isReservedArticleSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'reserved_slug' })
  }

  if (slug !== existing.slug) {
    const [dup] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)
    if (dup && dup.id !== id) {
      throw createError({ statusCode: 409, statusMessage: 'slug_exists' })
    }
  }

  const visibility = body.visibility !== undefined
    ? body.visibility === 'private'
      ? 'private'
      : 'public'
    : existing.visibility

  const status = body.status !== undefined
    ? body.status === 'published'
      ? 'published'
      : 'draft'
    : existing.status

  const content = body.content !== undefined ? serializeContent(body.content) : existing.content

  const termIds = body.termIds
  if (termIds !== undefined) {
    const list = Array.isArray(termIds) ? termIds.filter(Boolean) : []
    for (const tid of list) {
      const [t] = await db.select().from(terms).where(eq(terms.id, tid)).limit(1)
      if (!t) {
        throw createError({ statusCode: 400, statusMessage: 'invalid_term' })
      }
    }
    await db.delete(articleTerms).where(eq(articleTerms.articleId, id))
    for (const tid of list) {
      await db.insert(articleTerms).values({ articleId: id, termId: tid })
    }
  }

  await db
    .update(articles)
    .set({
      slug,
      title,
      content,
      visibility,
      status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(articles.id, id))

  return { success: true }
})

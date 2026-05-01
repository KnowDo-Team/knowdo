import { eq, inArray } from 'drizzle-orm'
import { articleTerms, articles, terms } from '../../../database/schema'
import { getCurrentUser } from '../../../utils/auth'
import { isStaffRole } from '../../../utils/roles'
import { useDb } from '../../../utils/db'
import { listChildTerms, resolveTermPath } from '../../../utils/terms'

export default defineEventHandler(async (event) => {
  const pathParam = getRouterParam(event, 'path')
  const segments = pathParam
    ? pathParam.split('/').map(s => s.trim()).filter(Boolean)
    : []

  const db = await useDb()

  const termId = await resolveTermPath(db, segments)
  if (!termId) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const [termRow] = await db.select().from(terms).where(eq(terms.id, termId)).limit(1)
  const children = await listChildTerms(db, termId)

  const links = await db.select({ articleId: articleTerms.articleId }).from(articleTerms).where(eq(articleTerms.termId, termId))
  const ids = links.map(l => l.articleId)
  if (ids.length === 0) {
    return {
      term: termRow ? { id: termRow.id, slug: termRow.slug, name: termRow.name } : null,
      children: children.map(t => ({ id: t.id, slug: t.slug, name: t.name })),
      articles: []
    }
  }

  const articleRows = await db.select().from(articles).where(inArray(articles.id, ids))

  const user = await getCurrentUser(event)
  const staff = user && isStaffRole(user.role)

  const visible = articleRows.filter((a) => {
    if (a.status !== 'published' && !staff) return false
    if (a.visibility === 'private' && !staff) return false
    return true
  })

  return {
    term: termRow ? { id: termRow.id, slug: termRow.slug, name: termRow.name } : null,
    children: children.map(t => ({ id: t.id, slug: t.slug, name: t.name })),
    articles: visible.map(a => ({ id: a.id, slug: a.slug, title: a.title }))
  }
})

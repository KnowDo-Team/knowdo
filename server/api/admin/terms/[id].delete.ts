import { inArray } from 'drizzle-orm'
import { articleTerms, articles, terms } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'
import { useDb } from '../../../utils/db'

type DeleteArticleAction = 'detach' | 'delete'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ articleAction?: DeleteArticleAction }>(event).catch(() => ({ articleAction: undefined }))
  const articleAction: DeleteArticleAction = body.articleAction === 'delete' ? 'delete' : 'detach'
  const db = await useDb()

  const allTerms = await db.select().from(terms)
  const target = allTerms.find(term => term.id === id)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const childrenByParent = new Map<string | null, typeof allTerms>()
  for (const term of allTerms) {
    const parentId = term.parentId ?? null
    const list = childrenByParent.get(parentId) ?? []
    list.push(term)
    childrenByParent.set(parentId, list)
  }

  const termIds: string[] = []
  const collectTermIds = (termId: string) => {
    termIds.push(termId)
    for (const child of childrenByParent.get(termId) ?? []) {
      collectTermIds(child.id)
    }
  }

  collectTermIds(id)

  const links = await db
    .select({ articleId: articleTerms.articleId })
    .from(articleTerms)
    .where(inArray(articleTerms.termId, termIds))
  const articleIds = [...new Set(links.map(link => link.articleId))]

  if (articleAction === 'delete' && articleIds.length > 0) {
    await db.delete(articleTerms).where(inArray(articleTerms.articleId, articleIds))
    await db.delete(articles).where(inArray(articles.id, articleIds))
  } else {
    await db.delete(articleTerms).where(inArray(articleTerms.termId, termIds))
  }

  await db.delete(terms).where(inArray(terms.id, termIds))

  return {
    success: true,
    deletedTerms: termIds.length,
    affectedArticles: articleIds.length,
    deletedArticles: articleAction === 'delete' ? articleIds.length : 0
  }
})

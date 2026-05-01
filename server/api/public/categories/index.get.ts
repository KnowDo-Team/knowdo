import { terms } from '../../../database/schema'
import { useDb } from '../../../utils/db'
import { listChildTerms } from '../../../utils/terms'

export default defineEventHandler(async () => {
  const db = await useDb()
  const roots = await listChildTerms(db, null)
  const allTerms = await db.select().from(terms)
  return {
    term: null,
    terms: allTerms.map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      parentId: t.parentId
    })),
    children: roots.map(t => ({ id: t.id, slug: t.slug, name: t.name })),
    articles: [] as { id: string; slug: string; title: string }[]
  }
})

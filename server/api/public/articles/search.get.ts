import { and, eq, or, like } from 'drizzle-orm'
import { articles } from '../../../database/schema'
import { useDb } from '../../../utils/db'

function normalizeQuery(raw: string) {
  return raw.trim().replace(/^\/+/, '').split('/').filter(Boolean)[0] ?? raw.trim().replace(/^\/+/, '')
}

/** Strip characters that break LIKE patterns in our simple matcher */
function likeFragment(s: string) {
  return s.replace(/[%_]/g, '')
}

export default defineEventHandler(async (event) => {
  const raw = String(getQuery(event).q ?? '').trim()
  if (!raw) {
    return { query: '', directSlug: null as string | null, results: [] as { slug: string; title: string; updatedAt: string }[] }
  }

  const segment = normalizeQuery(raw)
  if (!segment) {
    return { query: raw, directSlug: null as string | null, results: [] }
  }

  const db = await useDb()

  const [exact] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, segment))
    .limit(1)

  if (exact && exact.status === 'published' && exact.visibility === 'public') {
    return {
      query: raw,
      directSlug: exact.slug,
      results: []
    }
  }

  const frag = likeFragment(segment)
  if (!frag) {
    return { query: raw, directSlug: null as string | null, results: [] }
  }

  const pattern = `%${frag}%`
  const rows = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      updatedAt: articles.updatedAt
    })
    .from(articles)
    .where(
      and(
        eq(articles.status, 'published'),
        eq(articles.visibility, 'public'),
        or(like(articles.slug, pattern), like(articles.title, pattern))
      )
    )
    .limit(50)

  return {
    query: raw,
    directSlug: null as string | null,
    results: rows
  }
})

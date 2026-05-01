import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from './db'
import { terms } from '../database/schema'

/** Resolve `/categories/a/b/c` segments to a term id, or null */
export async function resolveTermPath(db: Db, segments: string[]): Promise<string | null> {
  if (segments.length === 0) return null

  let parentId: string | null = null
  for (const seg of segments) {
    const slug = decodeURIComponent(seg).trim()
    if (!slug) return null

    const rows: { id: string }[] = parentId === null
      ? await db
          .select({ id: terms.id })
          .from(terms)
          .where(and(eq(terms.slug, slug), isNull(terms.parentId)))
          .limit(1)
      : await db
          .select({ id: terms.id })
          .from(terms)
          .where(and(eq(terms.slug, slug), eq(terms.parentId, parentId)))
          .limit(1)

    const row = rows[0]
    if (!row) return null
    parentId = row.id
  }

  return parentId
}

/** List direct children of parent (null = roots) */
export async function listChildTerms(db: Db, parentId: string | null) {
  if (parentId === null) {
    return db.select().from(terms).where(isNull(terms.parentId))
  }
  return db.select().from(terms).where(eq(terms.parentId, parentId))
}

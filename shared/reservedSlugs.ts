/** Reserved first path segments — articles cannot use these as `slug` */
export const RESERVED_ARTICLE_SLUGS = new Set([
  'admin',
  'api',
  'categories',
  'login',
  'search',
  'setup',
  '_nuxt',
  'favicon.ico'
])

export function isReservedArticleSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase()
  if (!s) return true
  return RESERVED_ARTICLE_SLUGS.has(s)
}

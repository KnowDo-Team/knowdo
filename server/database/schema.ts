import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  role: text('role').notNull().default('editor'),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull()
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull()
})

export const terms = sqliteTable('terms', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull()
})

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  /** TipTap / UEditor JSON (stored as text) */
  content: text('content').notNull(),
  visibility: text('visibility').notNull().default('public'),
  status: text('status').notNull().default('draft'),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const articleTerms = sqliteTable(
  'article_terms',
  {
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    termId: text('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' })
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.termId] })
  })
)

export type UserRole = 'superadmin' | 'admin' | 'editor'

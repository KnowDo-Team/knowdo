import { mysqlTable, primaryKey as mysqlPrimaryKey, text as mysqlText, varchar as mysqlVarchar } from 'drizzle-orm/mysql-core'
import { pgTable, primaryKey as pgPrimaryKey, text as pgText, varchar as pgVarchar } from 'drizzle-orm/pg-core'
import { sqliteTable, primaryKey as sqlitePrimaryKey, text as sqliteText } from 'drizzle-orm/sqlite-core'

const dbType = process.env.DB_TYPE || 'sqlite'
const isMysql = dbType === 'mysql'
const isPostgres = ['pgsql', 'postgres', 'postgresql'].includes(dbType)

// --- Dialect Helpers ---

// Table Builder
export const table = (isMysql ? mysqlTable : isPostgres ? pgTable : sqliteTable) as any

// Primary Key Builder
export const primaryKey = (isMysql ? mysqlPrimaryKey : isPostgres ? pgPrimaryKey : sqlitePrimaryKey) as any

// Common Columns
export const textCol = (name: string, length: number = 255): any => {
  if (isMysql) return mysqlVarchar(name, { length })
  if (isPostgres) return pgVarchar(name, { length })
  return sqliteText(name)
}

export const longTextCol = (name: string): any => {
  if (isMysql) return mysqlText(name)
  if (isPostgres) return pgText(name)
  return sqliteText(name)
}

export const users = table('users', {
  id: textCol('id').primaryKey(),
  username: textCol('username').notNull().unique(),
  role: textCol('role', 32).notNull().default('editor'),
  passwordHash: textCol('password_hash').notNull(),
  createdAt: textCol('created_at').notNull()
})

export const sessions = table('sessions', {
  id: textCol('id').primaryKey(),
  userId: textCol('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: textCol('token_hash').notNull().unique(),
  createdAt: textCol('created_at').notNull(),
  expiresAt: textCol('expires_at').notNull()
})

export const terms = table('terms', {
  id: textCol('id').primaryKey(),
  parentId: textCol('parent_id'),
  slug: textCol('slug').notNull(),
  name: textCol('name').notNull(),
  createdAt: textCol('created_at').notNull()
})

export const articles = table('articles', {
  id: textCol('id').primaryKey(),
  slug: textCol('slug').notNull().unique(),
  title: textCol('title').notNull(),
  /** TipTap / UEditor JSON (stored as text) */
  content: longTextCol('content').notNull(),
  visibility: textCol('visibility', 32).notNull().default('public'),
  status: textCol('status', 32).notNull().default('draft'),
  authorId: textCol('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: textCol('created_at').notNull(),
  updatedAt: textCol('updated_at').notNull()
})

export const articleTerms = table(
  'article_terms',
  {
    articleId: textCol('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    termId: textCol('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' })
  },
  (t: any) => ({
    pk: primaryKey({ columns: [t.articleId, t.termId] })
  })
)

export type UserRole = 'superadmin' | 'admin' | 'editor'

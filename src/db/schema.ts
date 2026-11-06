// Tabelas do Duck Hub (WI-0004, ADR 0007). Guarda-se o mínimo (regra 9).
// A página /privacy (en.privacy.items) lista estas colunas: mudar uma obriga a
// mudar a outra. Tudo o que pertence a um utilizador referencia users.id com
// ON DELETE CASCADE, para o apagamento de conta não deixar restos (AC7).
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  intraId: integer('intra_id').notNull().unique(),
  login: text('login').notNull(),
  campusId: integer('campus_id').notNull(),
});

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 do token do cookie; o token em si nunca é guardado (AC4). */
    idHash: text('id_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)]
);

/**
 * Passaporte (WI-0005, ADR 0008): o snapshot da última sincronização. O JSONB
 * valida-se com Zod ao ler (src/passport/store.ts), nunca se confia nele.
 */
export const passports = pgTable('passports', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  snapshot: jsonb('snapshot').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' }).notNull(),
});

/**
 * Cache do XP dos projetos do Common Core (WI-0007, ADR 0009), por campus,
 * válida 24 h. Dados públicos da API, sem nada de nenhum utilizador: por isso
 * não entra na lista de /privacy.
 */
export const projectXp = pgTable(
  'project_xp',
  {
    campusId: integer('campus_id').notNull(),
    slug: text('slug').notNull(),
    projectId: integer('project_id').notNull(),
    name: text('name').notNull(),
    xp: integer('xp').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.campusId, t.slug] })]
);

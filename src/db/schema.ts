// Tabelas do Duck Hub (WI-0004, ADR 0007). Guarda-se o mínimo (regra 9).
// A página /privacy (en.privacy.items) lista estas colunas: mudar uma obriga a
// mudar a outra. Tudo o que pertence a um utilizador referencia users.id com
// ON DELETE CASCADE, para o apagamento de conta não deixar restos (AC7).
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

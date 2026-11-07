// Tabelas do Duck Hub (WI-0004, ADR 0007). Guarda-se o mínimo (regra 9).
// A página /privacy (en.privacy.items) lista estas colunas: mudar uma obriga a
// mudar a outra. Tudo o que pertence a um utilizador referencia users.id com
// ON DELETE CASCADE, para o apagamento de conta não deixar restos (AC7).
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  intraId: integer('intra_id').notNull().unique(),
  login: text('login').notNull(),
  campusId: integer('campus_id').notNull(),
  /** Passaporte escondido da comunidade (WI-0009, ADR 0010). Visível por omissão. */
  passportHidden: boolean('passport_hidden').notNull().default(false),
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
    /** Projeto a solo (WI-0017, ADR 0016): da project_session; na dúvida, a solo. */
    solo: boolean('solo').notNull().default(true),
    fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.campusId, t.slug] })]
);

/**
 * Duck Pond (WI-0012, ADR 0013): os eventos das sincronizações, um PondEvent
 * por linha. O JSONB valida-se com Zod ao ler (src/pond/store.ts). Apagam-se ao
 * fim de 90 dias; o índice (created_at, id) serve a ordem do feed e esse
 * DELETE, o de user_id a cascata e os eventos do próprio.
 */
export const pondEvents = pgTable(
  'pond_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    event: jsonb('event').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('pond_events_created_at_idx').on(t.createdAt, t.id),
    index('pond_events_user_id_idx').on(t.userId),
  ]
);

/**
 * Rubber Ducks (WI-0013, ADR 0014): quem deu um Duck a que evento. A chave
 * primária garante um Duck por pessoa por evento (AC2); as duas cascatas levam
 * os Ducks quando o evento expira ou quando alguém apaga a conta (AC5). O
 * índice de user_id serve a cascata do apagamento de conta; a chave primária
 * serve a contagem por evento.
 */
export const rubberDucks = pgTable(
  'rubber_ducks',
  {
    eventId: bigint('event_id', { mode: 'number' })
      .notNull()
      .references(() => pondEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.userId] }),
    index('rubber_ducks_user_id_idx').on(t.userId),
  ]
);

/**
 * Perfil de trabalho do The Tavern (WI-0015): as respostas do questionário,
 * uma linha por pessoa. Sem respostas não há linha. As colunas de texto
 * validam-se com Zod ao ler (src/tavern/store.ts); NULL = sem resposta. Só o
 * próprio vê as respostas.
 */
export const workProfiles = pgTable('work_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  periods: text('periods')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  start: text('start'),
  gradeGoal: text('grade_goal'),
  pace: text('pace'),
  style: text('style'),
  setting: text('setting'),
  role: text('role'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

/**
 * Lobbies do The Tavern (WI-0017, ADR 0016): quem entrou em que lobby e quando.
 * Uma entrada por pessoa por projeto (chave primária). Conta só durante 14
 * dias; as expiradas apagam-se na sincronização do Passaporte, tal como as de
 * projetos onde a pessoa já não está inscrita. Esconder o Passaporte apaga-as.
 */
export const lobbyEntries = pgTable(
  'lobby_entries',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectSlug: text('project_slug').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectSlug] })]
);

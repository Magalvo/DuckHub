// PondStore sobre Drizzle (WI-0012, ADR 0013). A seleção e a ordem fazem-se na
// BD; cada evento valida-se com Zod ao ler e um inválido não aparece. Os
// eventos de quem escondeu o Passaporte só aparecem ao próprio (AC5).
// Rubber Ducks (WI-0013, ADR 0014): a contagem e o "já dei" vêm na mesma
// consulta do feed; a unicidade é a chave primária de rubber_ducks.
import { and, desc, eq, gte, or, sql } from 'drizzle-orm';

import type { Db } from '../db/store';
import { pondEvents, rubberDucks, users } from '../db/schema';
import { pondEventSchema, type PondEvent } from './events';
import { PAGE_SIZE, RETENTION_DAYS } from './feed';

export interface PondRow {
  id: number;
  login: string;
  event: PondEvent;
  createdAt: number;
  /** Quantos Ducks o evento tem; nunca quem os deu (regra 9). */
  ducks: number;
  /** Quem vê o feed já deu um Duck a este evento. */
  ducked: boolean;
  /** O evento é de quem vê o feed: não pode dar-lhe um Duck. */
  own: boolean;
}

export interface PondStore {
  listEvents(input: { viewerId: string; page: number }): Promise<{
    events: PondRow[];
    hasNext: boolean;
  }>;
  /**
   * O dono de um evento que quem pede vê no feed (não expirado, dono visível
   * ou o próprio). Null se não existir ou não o vir (ADR 0010).
   */
  findVisibleEvent(input: {
    viewerId: string;
    eventId: number;
  }): Promise<{ ownerId: string } | null>;
  /** Dá um Duck; idempotente (ON CONFLICT DO NOTHING). */
  giveDuck(input: { userId: string; eventId: number }): Promise<void>;
  /** Retira um Duck; idempotente. */
  takeDuck(input: { userId: string; eventId: number }): Promise<void>;
}

/** O evento está no feed de quem vê: dentro dos 90 dias e de alguém visível ou do próprio. */
const visibleTo = (viewerId: string) =>
  and(
    // Nunca mais de 90 dias, mesmo que a limpeza ainda não tenha corrido.
    gte(pondEvents.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`),
    or(eq(users.passportHidden, false), eq(users.id, viewerId))
  );

export function createDrizzlePondStore(db: Db): PondStore {
  return {
    async listEvents({ viewerId, page }) {
      // Pede-se uma linha a mais: diz se há página seguinte sem um COUNT. As
      // subconsultas usam a chave primária (event_id, user_id) de rubber_ducks.
      const rows = await db
        .select({
          id: pondEvents.id,
          login: users.login,
          ownerId: pondEvents.userId,
          event: pondEvents.event,
          createdAt: pondEvents.createdAt,
          ducks:
            sql`(SELECT count(*) FROM ${rubberDucks} WHERE ${rubberDucks.eventId} = ${pondEvents.id})`.mapWith(
              Number
            ),
          ducked:
            sql`EXISTS (SELECT 1 FROM ${rubberDucks} WHERE ${rubberDucks.eventId} = ${pondEvents.id} AND ${rubberDucks.userId} = ${viewerId})`.mapWith(
              Boolean
            ),
        })
        .from(pondEvents)
        .innerJoin(users, eq(users.id, pondEvents.userId))
        .where(visibleTo(viewerId))
        .orderBy(desc(pondEvents.createdAt), desc(pondEvents.id))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

      // hasNext conta as linhas da BD antes de tirar os eventos inválidos: a
      // paginação nunca salta eventos (como no diretório, ADR 0012).
      const events = rows.slice(0, PAGE_SIZE).flatMap((row) => {
        const parsed = pondEventSchema.safeParse(row.event);
        return parsed.success
          ? [
              {
                id: row.id,
                login: row.login,
                event: parsed.data,
                createdAt: row.createdAt.getTime(),
                ducks: row.ducks,
                ducked: row.ducked,
                own: row.ownerId === viewerId,
              },
            ]
          : [];
      });
      return { events, hasNext: rows.length > PAGE_SIZE };
    },

    async findVisibleEvent({ viewerId, eventId }) {
      const rows = await db
        .select({ ownerId: pondEvents.userId })
        .from(pondEvents)
        .innerJoin(users, eq(users.id, pondEvents.userId))
        .where(and(eq(pondEvents.id, eventId), visibleTo(viewerId)));
      return rows[0] ?? null;
    },

    async giveDuck({ userId, eventId }) {
      // Pela BD: dois pedidos simultâneos dão um só Duck (AC2). INSERT … SELECT:
      // um evento apagado depois da verificação (expirou) não insere nada.
      await db
        .insert(rubberDucks)
        .select(
          db
            .select({
              eventId: pondEvents.id,
              userId: sql`${userId}::uuid`.as('user_id'),
              createdAt: sql`now()`.as('created_at'),
            })
            .from(pondEvents)
            .where(eq(pondEvents.id, eventId))
        )
        .onConflictDoNothing();
    },

    async takeDuck({ userId, eventId }) {
      await db
        .delete(rubberDucks)
        .where(and(eq(rubberDucks.eventId, eventId), eq(rubberDucks.userId, userId)));
    },
  };
}

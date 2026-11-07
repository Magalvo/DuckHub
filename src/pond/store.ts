// PondStore sobre Drizzle (WI-0012, ADR 0013). A seleção e a ordem fazem-se na
// BD; cada evento valida-se com Zod ao ler e um inválido não aparece. Os
// eventos de quem escondeu o Passaporte só aparecem ao próprio (AC5).
import { and, desc, eq, gte, or, sql } from 'drizzle-orm';

import type { Db } from '../db/store';
import { pondEvents, users } from '../db/schema';
import { pondEventSchema, type PondEvent } from './events';
import { PAGE_SIZE, RETENTION_DAYS } from './feed';

export interface PondRow {
  id: number;
  login: string;
  event: PondEvent;
  createdAt: number;
}

export interface PondStore {
  listEvents(input: { viewerId: string; page: number }): Promise<{
    events: PondRow[];
    hasNext: boolean;
  }>;
}

export function createDrizzlePondStore(db: Db): PondStore {
  return {
    async listEvents({ viewerId, page }) {
      // Pede-se uma linha a mais: diz se há página seguinte sem um COUNT.
      const rows = await db
        .select({
          id: pondEvents.id,
          login: users.login,
          event: pondEvents.event,
          createdAt: pondEvents.createdAt,
        })
        .from(pondEvents)
        .innerJoin(users, eq(users.id, pondEvents.userId))
        .where(
          and(
            // Nunca mais de 90 dias, mesmo que a limpeza ainda não tenha corrido.
            gte(pondEvents.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`),
            or(eq(users.passportHidden, false), eq(users.id, viewerId))
          )
        )
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
              },
            ]
          : [];
      });
      return { events, hasNext: rows.length > PAGE_SIZE };
    },
  };
}

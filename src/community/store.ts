// DirectoryStore sobre Drizzle (WI-0010, ADR 0012). A seleção toda faz-se na
// BD: nunca se carregam todos os membros para a memória. Todos os valores vão
// como parâmetros ligados (query builder e template sql), nunca concatenados.
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../db/store';
import { passports, users } from '../db/schema';
import type { PassportSnapshot } from '../passport/passport';
import { snapshotSchema } from '../passport/store';
import { PAGE_SIZE, type CampusOption } from './directory';

export interface DirectoryFilter {
  /** Padrão do ILIKE já escapado (likePattern), ou null para todos. */
  pattern: string | null;
  campusId: number | null;
  page: number;
}

export interface DirectoryStore {
  listMembers(filter: DirectoryFilter): Promise<{
    members: { snapshot: PassportSnapshot; syncedAt: number }[];
    hasNext: boolean;
  }>;
  campusOptions(): Promise<CampusOption[]>;
}

export function createDrizzleDirectoryStore(db: Db): DirectoryStore {
  /**
   * Um Passaporte por login: o que sincronizou por último (como o loadPublic do
   * WI-0009). O hidden filtra-se depois, para um login cujo Passaporte mais
   * recente está escondido não aparecer pelo de uma conta mais antiga.
   */
  const latest = () =>
    db.$with('latest').as(
      db
        .selectDistinctOn([users.login], {
          login: users.login,
          campusId: users.campusId,
          hidden: users.passportHidden,
          snapshot: passports.snapshot,
          syncedAt: passports.syncedAt,
        })
        .from(users)
        .innerJoin(passports, eq(passports.userId, users.id))
        .orderBy(users.login, desc(passports.syncedAt))
    );

  return {
    async listMembers({ pattern, campusId, page }) {
      const l = latest();
      const conditions: SQL[] = [eq(l.hidden, false)];
      if (campusId !== null) conditions.push(eq(l.campusId, campusId));
      if (pattern !== null) conditions.push(sql`${l.login} ILIKE ${pattern} ESCAPE '\\'`);

      // Pede-se uma linha a mais: diz se há página seguinte sem um COUNT.
      const rows = await db
        .with(l)
        .select({ snapshot: l.snapshot, syncedAt: l.syncedAt })
        .from(l)
        .where(and(...conditions))
        .orderBy(sql`${l.login} COLLATE "C"`)
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);

      // hasNext conta as linhas da BD antes de tirar os snapshots inválidos:
      // a paginação nunca salta membros (ADR 0012).
      const members = rows.slice(0, PAGE_SIZE).flatMap((row) => {
        const parsed = snapshotSchema.safeParse(row.snapshot);
        return parsed.success ? [{ snapshot: parsed.data, syncedAt: row.syncedAt.getTime() }] : [];
      });
      return { members, hasNext: rows.length > PAGE_SIZE };
    },

    async campusOptions() {
      const l = latest();
      // Um nome por campus: o do snapshot sincronizado por último.
      const rows = await db
        .with(l)
        .selectDistinctOn([l.campusId], {
          id: l.campusId,
          name: sql<unknown>`${l.snapshot}->>'campus'`,
        })
        .from(l)
        .where(eq(l.hidden, false))
        .orderBy(l.campusId, desc(l.syncedAt));
      const options = rows.flatMap((row) =>
        typeof row.name === 'string' && row.name.trim() !== ''
          ? [{ id: row.id, name: row.name }]
          : []
      );
      // Poucos campus: ordena-se aqui, por code points, como o COLLATE "C".
      return options.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    },
  };
}

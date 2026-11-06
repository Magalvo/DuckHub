// Store da cache de XP (WI-0007, ADR 0009) sobre Drizzle: node-postgres em
// produção, PGlite nos testes e no e2e.
import { eq } from 'drizzle-orm';

import type { Db } from '../db/store';
import { projectXp, users } from '../db/schema';

/** Um projeto da calculadora, como vem da API. */
export interface ProjectXp {
  slug: string;
  projectId: number;
  name: string;
  xp: number;
}

/** Um projeto em cache: o valor da API e quando se leu (ms). */
export interface CachedProjectXp extends ProjectXp {
  fetchedAt: number;
}

export interface ProjectXpStore {
  load(campusId: number): Promise<CachedProjectXp[]>;
  /** Substitui todas as linhas do campus, numa transação. */
  replace(campusId: number, projects: readonly ProjectXp[], fetchedAt: number): Promise<void>;
  /** O campus principal do utilizador (users.campus_id); null se não existir. */
  campusOf(userId: string): Promise<number | null>;
}

export function createDrizzleProjectXpStore(db: Db): ProjectXpStore {
  return {
    async load(campusId) {
      const rows = await db
        .select({
          slug: projectXp.slug,
          projectId: projectXp.projectId,
          name: projectXp.name,
          xp: projectXp.xp,
          fetchedAt: projectXp.fetchedAt,
        })
        .from(projectXp)
        .where(eq(projectXp.campusId, campusId));
      return rows.map((r) => ({ ...r, fetchedAt: r.fetchedAt.getTime() }));
    },
    async replace(campusId, projects, fetchedAt) {
      // Apagar e inserir: um slug que saia da API não fica para trás com uma
      // data antiga, que obrigaria a atualizar a cache em todos os pedidos.
      await db.transaction(async (tx) => {
        await tx.delete(projectXp).where(eq(projectXp.campusId, campusId));
        if (projects.length === 0) return;
        const at = new Date(fetchedAt);
        await tx.insert(projectXp).values(projects.map((p) => ({ ...p, campusId, fetchedAt: at })));
      });
    },
    async campusOf(userId) {
      const [row] = await db
        .select({ campusId: users.campusId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return row?.campusId ?? null;
    },
  };
}

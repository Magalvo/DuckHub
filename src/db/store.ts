// SessionStore sobre Drizzle. Funciona com qualquer driver PostgreSQL do
// Drizzle: node-postgres em produção, PGlite nos testes de integração.
import { eq, lt, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import type { SessionStore } from '../auth/handlers';
import { sessions, users } from './schema';

export type Db = PgDatabase<PgQueryResultHKT>;

export function createDrizzleStore(db: Db): SessionStore {
  return {
    async upsertUser(user) {
      const [row] = await db
        .insert(users)
        .values(user)
        .onConflictDoUpdate({
          target: users.intraId,
          set: { login: user.login, campusId: user.campusId },
        })
        .returning({ userId: users.id });
      if (row === undefined) throw new Error('upsertUser: no row returned');
      return row;
    },
    async createSession({ idHash, userId, expiresAt }) {
      // Limpeza oportunista: sessões expiradas de quem não volta não ficam na BD.
      await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`));
      await db.insert(sessions).values({ idHash, userId, expiresAt: new Date(expiresAt) });
    },
    async findSession(idHash) {
      const [row] = await db
        .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
        .from(sessions)
        .where(eq(sessions.idHash, idHash))
        .limit(1);
      return row === undefined ? null : { userId: row.userId, expiresAt: row.expiresAt.getTime() };
    },
    async renewSession(idHash, expiresAt) {
      await db
        .update(sessions)
        .set({ expiresAt: new Date(expiresAt) })
        .where(eq(sessions.idHash, idHash));
    },
    async deleteSession(idHash) {
      await db.delete(sessions).where(eq(sessions.idHash, idHash));
    },
    async deleteUser(userId) {
      // As sessões (e tudo o que vier a referenciar users) vão em cascata.
      await db.delete(users).where(eq(users.id, userId));
    },
  };
}

// PassportStore sobre Drizzle (WI-0005, ADR 0008). O snapshot JSONB valida-se
// com Zod ao ler: um snapshot inválido conta como "ainda não sincronizado" e o
// próximo login reescreve-o. O conteúdo inválido não se regista em lado nenhum.
import { and, desc, eq, lt, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../db/store';
import { lobbyEntries, passports, pondEvents, users } from '../db/schema';
import { diffEvents } from '../pond/events';
import { RETENTION_DAYS } from '../pond/feed';
import { LOBBY_TTL_DAYS, sameProjectSlugs } from '../tavern/lobby';
import { realWorldSlugGroups } from './real-world';
import type { PassportSnapshot } from './passport';
import type { PassportStore } from './sync';
import type { PassportVisibilityStore } from './visibility';

/** A cor entra numa variável CSS: só hex, nada que se possa injetar. */
const hexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);

/** Também o usa o diretório (WI-0010). */
export const snapshotSchema: z.ZodType<PassportSnapshot> = z.object({
  login: z.string().min(1),
  campus: z.string(),
  piscine: z.object({ month: z.string(), year: z.number().int() }),
  isAlumni: z.boolean(),
  coalition: z.object({ name: z.string(), color: hexColor }).nullable(),
  cursus: z.array(
    z.object({ slug: z.string(), name: z.string(), level: z.number().nonnegative() })
  ),
  projects: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      status: z.string(),
      finalMark: z.number().nullable(),
      validated: z.boolean().nullable(),
    })
  ),
});

export function createDrizzlePassportStore(db: Db): PassportStore & PassportVisibilityStore {
  return {
    /**
     * WI-0012 (ADR 0013): numa só transação, lê o snapshot anterior com FOR
     * UPDATE (dois logins em simultâneo esperam um pelo outro e o segundo já
     * vê o snapshot novo), grava o novo, insere os eventos da diferença e apaga
     * os eventos expirados. Uma falha não deixa eventos sem snapshot.
     * WI-0017/WI-0018 (ADRs 0016 e 0017): na mesma transação, tira a pessoa
     * dos lobbies dos projetos que validou e apaga as entradas expiradas de
     * toda a gente (a limpeza depende de haver logins).
     */
    async save(userId, snapshot, syncedAt) {
      const values = { snapshot, syncedAt: new Date(syncedAt) };
      await db.transaction(async (tx) => {
        const [row] = await tx
          .select({ snapshot: passports.snapshot })
          .from(passports)
          .where(eq(passports.userId, userId))
          .for('update');
        // Um snapshot anterior inválido conta como primeira sincronização.
        const previous = row === undefined ? null : snapshotSchema.safeParse(row.snapshot);
        const events = diffEvents(previous?.success === true ? previous.data : null, snapshot);
        await tx
          .insert(passports)
          .values({ userId, ...values })
          .onConflictDoUpdate({ target: passports.userId, set: values });
        if (events.length > 0) {
          await tx.insert(pondEvents).values(events.map((event) => ({ userId, event })));
        }
        await tx
          .delete(pondEvents)
          .where(lt(pondEvents.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`));
        // ADR 0017: só validar o projeto tira a pessoa do lobby.
        // Validar um slug tira também dos lobbies dos outros slugs do grupo.
        const validated = sameProjectSlugs(
          snapshot.projects.filter((p) => p.validated === true).map((p) => p.slug),
          realWorldSlugGroups
        );
        if (validated.length > 0) {
          await tx
            .delete(lobbyEntries)
            .where(
              and(eq(lobbyEntries.userId, userId), inArray(lobbyEntries.projectSlug, validated))
            );
        }
        await tx
          .delete(lobbyEntries)
          .where(lt(lobbyEntries.joinedAt, sql`now() - make_interval(days => ${LOBBY_TTL_DAYS})`));
      });
    },
    async load(userId) {
      const [row] = await db
        .select({ snapshot: passports.snapshot, syncedAt: passports.syncedAt })
        .from(passports)
        .where(eq(passports.userId, userId))
        .limit(1);
      if (row === undefined) return null;
      const parsed = snapshotSchema.safeParse(row.snapshot);
      return parsed.success ? { snapshot: parsed.data, syncedAt: row.syncedAt.getTime() } : null;
    },
    // WI-0009 (ADR 0010): a vista pública e a definição de esconder.
    async loadPublic(login) {
      const [row] = await db
        .select({
          userId: users.id,
          hidden: users.passportHidden,
          snapshot: passports.snapshot,
          syncedAt: passports.syncedAt,
        })
        .from(users)
        .innerJoin(passports, eq(passports.userId, users.id))
        .where(eq(users.login, login))
        .orderBy(desc(passports.syncedAt))
        .limit(1);
      if (row === undefined) return null;
      const parsed = snapshotSchema.safeParse(row.snapshot);
      return parsed.success
        ? {
            userId: row.userId,
            hidden: row.hidden,
            snapshot: parsed.data,
            syncedAt: row.syncedAt.getTime(),
          }
        : null;
    },
    async isHidden(userId) {
      const [row] = await db
        .select({ hidden: users.passportHidden })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return row?.hidden ?? false;
    },
    async setHidden(userId, hidden) {
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passportHidden: hidden }).where(eq(users.id, userId));
        // WI-0017 (AC8): esconder tira a pessoa de todos os lobbies; mostrar
        // outra vez não a põe de volta.
        if (hidden) await tx.delete(lobbyEntries).where(eq(lobbyEntries.userId, userId));
      });
    },
  };
}

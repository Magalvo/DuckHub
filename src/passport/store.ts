// PassportStore sobre Drizzle (WI-0005, ADR 0008). O snapshot JSONB valida-se
// com Zod ao ler: um snapshot inválido conta como "ainda não sincronizado" e o
// próximo login reescreve-o. O conteúdo inválido não se regista em lado nenhum.
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../db/store';
import { passports, users } from '../db/schema';
import type { PassportSnapshot } from './passport';
import type { PassportStore } from './sync';
import type { PassportVisibilityStore } from './visibility';

/** A cor entra numa variável CSS: só hex, nada que se possa injetar. */
const hexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);

const snapshotSchema: z.ZodType<PassportSnapshot> = z.object({
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
    async save(userId, snapshot, syncedAt) {
      const values = { snapshot, syncedAt: new Date(syncedAt) };
      await db
        .insert(passports)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: passports.userId, set: values });
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
      await db.update(users).set({ passportHidden: hidden }).where(eq(users.id, userId));
    },
  };
}

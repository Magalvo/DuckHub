// PassportStore sobre Drizzle (WI-0005, ADR 0008). O snapshot JSONB valida-se
// com Zod ao ler: um snapshot inválido conta como "ainda não sincronizado" e o
// próximo login reescreve-o. O conteúdo inválido não se regista em lado nenhum.
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../db/store';
import { passports } from '../db/schema';
import type { PassportSnapshot } from './passport';
import type { PassportStore } from './sync';

/** A foto só pode ser https (CDN da 42) ou uma imagem inline. */
const imageUrl = z
  .string()
  .refine((s) => URL.canParse(s) && ['https:', 'data:'].includes(new URL(s).protocol));

/** A cor entra numa variável CSS: só hex, nada que se possa injetar. */
const hexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);

const snapshotSchema: z.ZodType<PassportSnapshot> = z.object({
  login: z.string().min(1),
  imageUrl: imageUrl.nullable(),
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

export function createDrizzlePassportStore(db: Db): PassportStore {
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
  };
}

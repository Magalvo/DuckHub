// Store da cache de XP (WI-0007) contra PostgreSQL em memória (PGlite), com as
// migrações de drizzle/. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDrizzleProjectXpStore, type ProjectXpStore } from '../../src/calculator/store.js';
import { createDrizzleStore } from '../../src/db/store.js';
import type { SessionStore } from '../../src/auth/handlers.js';

const T1 = Date.UTC(2026, 10, 5, 10, 0);
const T2 = Date.UTC(2026, 10, 6, 11, 0);
const A = { slug: 'projeto-a', projectId: 7001, name: 'Projeto A', xp: 500 };
const B = { slug: 'projeto-b', projectId: 7002, name: 'Projeto B', xp: 900 };

let client: PGlite;
let store: ProjectXpStore;
let sessions: SessionStore;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  store = createDrizzleProjectXpStore(db);
  sessions = createDrizzleStore(db);
});

beforeEach(async () => {
  await client.exec('TRUNCATE project_xp; TRUNCATE users CASCADE');
});

describe('createDrizzleProjectXpStore (PGlite)', () => {
  it('um campus sem linhas lê-se vazio', async () => {
    expect(await store.load(9001)).toEqual([]);
  });

  it('replace guarda as linhas do campus com a data; load lê só esse campus', async () => {
    await store.replace(9001, [A, B], T1);
    await store.replace(9002, [A], T2);
    const rows = await store.load(9001);
    expect([...rows].sort((x, y) => x.slug.localeCompare(y.slug))).toEqual([
      { ...A, fetchedAt: T1 },
      { ...B, fetchedAt: T1 },
    ]);
    expect(await store.load(9002)).toEqual([{ ...A, fetchedAt: T2 }]);
  });

  it('replace substitui tudo o que o campus tinha, sem tocar nos outros', async () => {
    await store.replace(9001, [A, B], T1);
    await store.replace(9002, [B], T1);
    await store.replace(9001, [{ ...A, xp: 550 }], T2);
    expect(await store.load(9001)).toEqual([{ ...A, xp: 550, fetchedAt: T2 }]);
    expect(await store.load(9002)).toEqual([{ ...B, fetchedAt: T1 }]);
  });

  it('a chave (campus_id, slug) não aceita duplicados: a transação inteira falha', async () => {
    await store.replace(9001, [A], T1);
    await expect(store.replace(9001, [B, B], T2)).rejects.toThrow();
    expect(await store.load(9001)).toEqual([{ ...A, fetchedAt: T1 }]);
  });

  it('campusOf lê o campus do utilizador; null se não existir', async () => {
    const { userId } = await sessions.upsertUser({
      intraId: 90001,
      login: 'pato-teste',
      campusId: 9001,
    });
    expect(await store.campusOf(userId)).toBe(9001);
    expect(await store.campusOf('00000000-0000-4000-8000-000000000000')).toBeNull();
  });
});

// Store Drizzle contra PostgreSQL real em memória (PGlite), com as mesmas
// migrações SQL de drizzle/ que correm em produção (ADR 0007). Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { SessionStore } from '../../src/auth/handlers.js';
import { createDrizzleStore } from '../../src/db/store.js';

// Bem no futuro (2096): o createSession limpa contra o now() real da BD.
const NOW = 4_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const pato = { intraId: 90001, login: 'pato-teste', campusId: 9001 };
const marreco = { intraId: 90002, login: 'marreco-teste', campusId: 9002 };

let client: PGlite;
let store: SessionStore;

// Arrancar o PGlite custa segundos: uma instância por ficheiro, limpa entre testes.
beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  store = createDrizzleStore(db);
});

beforeEach(async () => {
  await client.exec('TRUNCATE users CASCADE');
});

/** Todas as tabelas do schema public, lidas do catálogo e não do código. */
async function allTables(): Promise<string[]> {
  const { rows } = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  return rows.map((r) => r.table_name);
}

/** Linhas de uma tabela em que algum valor é um dos procurados. */
async function rowsMentioning(table: string, needles: readonly string[]): Promise<unknown[]> {
  const { rows } = await client.query<Record<string, unknown>>(`SELECT * FROM "${table}"`);
  return rows.filter((row) => Object.values(row).some((v) => needles.includes(String(v))));
}

describe('createDrizzleStore (PGlite)', () => {
  it('upsertUser é idempotente pelo intraId e atualiza login e campus', async () => {
    const first = await store.upsertUser(pato);
    const again = await store.upsertUser({ ...pato, login: 'pato-novo', campusId: 9002 });
    expect(again.userId).toBe(first.userId);
    const { rows } = await client.query('SELECT intra_id, login, campus_id FROM users');
    expect(rows).toEqual([{ intra_id: 90001, login: 'pato-novo', campus_id: 9002 }]);
  });

  it('cria, encontra, renova e apaga sessões', async () => {
    const { userId } = await store.upsertUser(pato);
    await store.createSession({ idHash: 'hash-a', userId, expiresAt: NOW + DAY });
    expect(await store.findSession('hash-a')).toEqual({ userId, expiresAt: NOW + DAY });
    expect(await store.findSession('hash-inexistente')).toBeNull();

    await store.renewSession('hash-a', NOW + 2 * DAY);
    expect(await store.findSession('hash-a')).toEqual({ userId, expiresAt: NOW + 2 * DAY });

    await store.deleteSession('hash-a');
    expect(await store.findSession('hash-a')).toBeNull();
  });

  it('AC7: apagar o utilizador não deixa nenhuma linha dele em nenhuma tabela', async () => {
    const gone = await store.upsertUser(pato);
    const kept = await store.upsertUser(marreco);
    for (const [i, user] of [gone, gone, kept].entries()) {
      await store.createSession({
        idHash: `hash-${String(i)}`,
        userId: user.userId,
        expiresAt: NOW + DAY,
      });
    }

    await store.deleteUser(gone.userId);

    const tables = await allTables();
    expect(tables).toEqual(expect.arrayContaining(['users', 'sessions']));
    const goneIds = [gone.userId, String(pato.intraId), pato.login, 'hash-0', 'hash-1'];
    for (const table of tables) {
      expect({ table, rows: await rowsMentioning(table, goneIds) }).toEqual({ table, rows: [] });
    }
    // O outro utilizador fica intacto.
    expect(await store.findSession('hash-2')).toEqual({
      userId: kept.userId,
      expiresAt: NOW + DAY,
    });
    expect(await rowsMentioning('users', [kept.userId])).toHaveLength(1);
  });

  it('criar uma sessão apaga as sessões já expiradas, de qualquer utilizador', async () => {
    const a = await store.upsertUser(pato);
    const b = await store.upsertUser(marreco);
    const now = Date.now();
    await store.createSession({ idHash: 'expirada', userId: b.userId, expiresAt: now - DAY });
    await store.createSession({ idHash: 'valida', userId: b.userId, expiresAt: now + DAY });

    await store.createSession({ idHash: 'nova', userId: a.userId, expiresAt: now + DAY });

    expect(await store.findSession('expirada')).toBeNull();
    expect(await store.findSession('valida')).not.toBeNull();
    expect(await store.findSession('nova')).not.toBeNull();
  });

  it('apagar um utilizador que já não existe não falha', async () => {
    const { userId } = await store.upsertUser(pato);
    await store.deleteUser(userId);
    await expect(store.deleteUser(userId)).resolves.toBeUndefined();
  });
});

// Stores Drizzle contra PostgreSQL real em memória (PGlite), com as mesmas
// migrações SQL de drizzle/ que correm em produção (ADR 0007 e 0008). Dados
// inventados.
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { SessionStore } from '../../src/auth/handlers.js';
import { createDrizzleStore } from '../../src/db/store.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';
import { createDrizzlePassportStore } from '../../src/passport/store.js';
import type { PassportStore } from '../../src/passport/sync.js';

// Bem no futuro (2096): o createSession limpa contra o now() real da BD.
const NOW = 4_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const pato = { intraId: 90001, login: 'pato-teste', campusId: 9001 };
const marreco = { intraId: 90002, login: 'marreco-teste', campusId: 9002 };

let client: PGlite;
let store: SessionStore;
let passports: PassportStore;

const snapshot = (login: string): PassportSnapshot => ({
  login,
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: { name: 'Os Patos', color: '#0E12B5' },
  cursus: [{ slug: '42cursus', name: '42cursus', level: 5.17 }],
  projects: [
    { slug: 'projeto-1', name: 'Projeto 1', status: 'finished', finalMark: 100, validated: true },
  ],
});

// Arrancar o PGlite custa segundos: uma instância por ficheiro, limpa entre testes.
beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  store = createDrizzleStore(db);
  passports = createDrizzlePassportStore(db);
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

/**
 * Um valor de uma linha menciona um dos procurados: igual, se for escalar, ou
 * como string JSON lá dentro, se for JSONB (p. ex. o login no snapshot).
 */
const mentions = (value: unknown, needles: readonly string[]): boolean =>
  typeof value === 'object' && value !== null && !(value instanceof Date)
    ? needles.some((n) => JSON.stringify(value).includes(JSON.stringify(n)))
    : needles.includes(String(value));

/** Linhas de uma tabela em que algum valor menciona um dos procurados. */
async function rowsMentioning(table: string, needles: readonly string[]): Promise<unknown[]> {
  const { rows } = await client.query<Record<string, unknown>>(`SELECT * FROM "${table}"`);
  return rows.filter((row) => Object.values(row).some((v) => mentions(v, needles)));
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
    await passports.save(gone.userId, snapshot(pato.login), NOW);
    await passports.save(kept.userId, snapshot(marreco.login), NOW);

    await store.deleteUser(gone.userId);

    const tables = await allTables();
    expect(tables).toEqual(expect.arrayContaining(['users', 'sessions', 'passports']));
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
    expect(await passports.load(kept.userId)).not.toBeNull();
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

describe('createDrizzlePassportStore (PGlite)', () => {
  it('guarda e lê o snapshot; guardar de novo substitui-o', async () => {
    const { userId } = await store.upsertUser(pato);
    expect(await passports.load(userId)).toBeNull();
    await passports.save(userId, snapshot(pato.login), NOW);
    expect(await passports.load(userId)).toEqual({ snapshot: snapshot(pato.login), syncedAt: NOW });

    const newer = { ...snapshot(pato.login), isAlumni: true };
    await passports.save(userId, newer, NOW + DAY);
    expect(await passports.load(userId)).toEqual({ snapshot: newer, syncedAt: NOW + DAY });
    const { rows } = await client.query('SELECT user_id FROM passports');
    expect(rows).toHaveLength(1);
  });

  it.each([
    ['sem login', { ...snapshot(pato.login), login: undefined }],
    ['cor que não é hex', { ...snapshot(pato.login), coalition: { name: 'X', color: 'red;x' } }],
    ['não é um objeto', 'texto'],
  ])('um snapshot inválido (%s) lê-se como null', async (_case, invalid) => {
    const { userId } = await store.upsertUser(pato);
    await client.query(
      'INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, $2::jsonb, now())',
      [userId, JSON.stringify(invalid)]
    );
    expect(await passports.load(userId)).toBeNull();
  });

  it('um snapshot antigo com imageUrl lê-se sem ele (WI-0008)', async () => {
    const { userId } = await store.upsertUser(pato);
    const old = { ...snapshot(pato.login), imageUrl: 'https://cdn.example.test/foto.jpg' };
    await client.query(
      'INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, $2::jsonb, now())',
      [userId, JSON.stringify(old)]
    );
    const loaded = await passports.load(userId);
    expect(loaded?.snapshot).toEqual(snapshot(pato.login));
    expect(loaded?.snapshot).not.toHaveProperty('imageUrl');
  });
});

const journalSchema = z
  .object({ entries: z.array(z.object({ tag: z.string() }).passthrough()) })
  .passthrough();

/** Cópia de drizzle/ só com as migrações até `lastTag`, inclusive. */
async function migrationsUpTo(lastTag: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'duckhub-migrations-'));
  await mkdir(join(dir, 'meta'));
  const journal = journalSchema.parse(
    JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'))
  );
  const end = journal.entries.findIndex((e) => e.tag === lastTag);
  expect(end).toBeGreaterThanOrEqual(0);
  const entries = journal.entries.slice(0, end + 1);
  for (const { tag } of entries) {
    await copyFile(join('drizzle', `${tag}.sql`), join(dir, `${tag}.sql`));
  }
  await writeFile(join(dir, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
  return dir;
}

describe('migração 0002_passports_drop_image_url (PGlite)', () => {
  it('tira o imageUrl dos snapshots já guardados e deixa o resto igual', async () => {
    const old = new PGlite();
    const db = drizzle(old);
    const partial = await migrationsUpTo('0001_passports');
    try {
      await migrate(db, { migrationsFolder: partial });
    } finally {
      await rm(partial, { recursive: true, force: true });
    }
    const users = createDrizzleStore(db);
    const a = await users.upsertUser(pato);
    const b = await users.upsertUser(marreco);
    const withPhoto = { ...snapshot(pato.login), imageUrl: 'https://cdn.example.test/foto.jpg' };
    const withoutPhoto = snapshot(marreco.login);
    for (const [userId, value] of [
      [a.userId, withPhoto],
      [b.userId, withoutPhoto],
    ] as const) {
      await old.query(
        'INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, $2::jsonb, now())',
        [userId, JSON.stringify(value)]
      );
    }

    await migrate(db, { migrationsFolder: 'drizzle' });

    const { rows } = await old.query<{ user_id: string; snapshot: unknown }>(
      'SELECT user_id, snapshot FROM passports'
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.user_id === a.userId)?.snapshot).toEqual(snapshot(pato.login));
    expect(rows.find((r) => r.user_id === b.userId)?.snapshot).toEqual(withoutPhoto);
    await old.close();
  });
});

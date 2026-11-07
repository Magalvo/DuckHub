// Duck Pond (WI-0012, ADR 0013) sobre uma BD real (PGlite em memória, com as
// migrações): a transação da sincronização, os duplicados, a retenção, a
// visibilidade e a cascata, que o e2e não consegue cobrir. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDrizzleStore, type Db } from '../../../src/db/store.js';
import type { PassportSnapshot } from '../../../src/passport/passport.js';
import { createDrizzlePassportStore } from '../../../src/passport/store.js';
import { createDrizzlePondStore } from '../../../src/pond/store.js';

const NOW = Date.UTC(2026, 10, 7, 12, 0);

const snapshot = (login: string, overrides: Partial<PassportSnapshot> = {}): PassportSnapshot => ({
  login,
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus: [{ slug: '42cursus', name: '42cursus', level: 3.5 }],
  projects: [],
  ...overrides,
});

const validated = snapshot('pato-teste', {
  projects: [{ slug: 'libft', name: 'Libft', status: 'finished', validated: true, finalMark: 100 }],
});

let client: PGlite;
let db: Db;

// Uma BD para o ficheiro (as migrações demoram); cada teste começa vazio.
beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client);
  await migrate(pglite, { migrationsFolder: 'drizzle' });
  db = pglite;
}, 30_000);

beforeEach(async () => {
  await client.query('TRUNCATE users CASCADE');
});

afterAll(async () => {
  await client.close();
});

async function newUser(intraId: number, login: string, hidden = false): Promise<string> {
  const { userId } = await createDrizzleStore(db).upsertUser({ intraId, login, campusId: 9001 });
  await createDrizzlePassportStore(db).setHidden(userId, hidden);
  return userId;
}

async function storedEvents(): Promise<unknown[]> {
  const { rows } = await client.query<{ event: unknown }>(
    'SELECT event FROM pond_events ORDER BY id'
  );
  return rows.map((r) => r.event);
}

async function insertEvent(userId: string, event: unknown, daysAgo = 0): Promise<void> {
  await client.query(
    'INSERT INTO pond_events (user_id, event, created_at) VALUES ($1, $2::jsonb, now() - make_interval(days => $3))',
    [userId, JSON.stringify(event), daysAgo]
  );
}

describe('sincronização', () => {
  it('a primeira não gera eventos; a seguinte grava a diferença pela ordem do diff', async () => {
    const userId = await newUser(90001, 'pato-teste');
    const passports = createDrizzlePassportStore(db);
    await passports.save(userId, snapshot('pato-teste'), NOW);
    expect(await storedEvents()).toEqual([]);

    await passports.save(userId, validated, NOW + 1);
    expect(await storedEvents()).toEqual([
      { kind: 'project-validated', slug: 'libft', name: 'Libft', finalMark: 100 },
      { kind: 'badge', badgeId: 'first-validation' },
    ]);
    expect((await passports.load(userId))?.snapshot).toEqual(validated);
  });

  it('sincronizar outra vez sem mudanças, mesmo em simultâneo, não repete eventos', async () => {
    const userId = await newUser(90001, 'pato-teste');
    const passports = createDrizzlePassportStore(db);
    await passports.save(userId, snapshot('pato-teste'), NOW);
    await Promise.all([
      passports.save(userId, validated, NOW + 1),
      passports.save(userId, validated, NOW + 2),
    ]);
    await passports.save(userId, validated, NOW + 3);
    expect(await storedEvents()).toHaveLength(2);
  });

  it('um snapshot anterior inválido conta como primeira sincronização', async () => {
    const userId = await newUser(90001, 'pato-teste');
    await client.query(
      `INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, '{"login": 1}'::jsonb, now())`,
      [userId]
    );
    await createDrizzlePassportStore(db).save(userId, validated, NOW);
    expect(await storedEvents()).toEqual([]);
  });

  it('apaga os eventos com mais de 90 dias, de qualquer pessoa', async () => {
    const userId = await newUser(90001, 'pato-teste');
    const other = await newUser(90002, 'cisne-teste');
    await insertEvent(other, { kind: 'level-up', level: 2 }, 91);
    await insertEvent(other, { kind: 'level-up', level: 3 }, 89);
    await createDrizzlePassportStore(db).save(userId, snapshot('pato-teste'), NOW);
    expect(await storedEvents()).toEqual([{ kind: 'level-up', level: 3 }]);
  });
});

describe('feed', () => {
  it('do mais recente para o mais antigo, e pelo id quando a data é a mesma', async () => {
    const pato = await newUser(90001, 'pato-teste');
    await insertEvent(pato, { kind: 'level-up', level: 2 }, 2);
    await insertEvent(pato, { kind: 'level-up', level: 3 }, 1);
    await insertEvent(pato, { kind: 'level-up', level: 4 }, 1);
    const { events, hasNext } = await createDrizzlePondStore(db).listEvents({
      viewerId: pato,
      page: 1,
    });
    expect(events.map((e) => e.event)).toEqual([
      { kind: 'level-up', level: 4 },
      { kind: 'level-up', level: 3 },
      { kind: 'level-up', level: 2 },
    ]);
    expect(events.every((e) => e.login === 'pato-teste')).toBe(true);
    expect(hasNext).toBe(false);
  });

  it('páginas de 20; um evento inválido não aparece mas conta para a paginação', async () => {
    const pato = await newUser(90001, 'pato-teste');
    for (let i = 0; i < 20; i += 1) await insertEvent(pato, { kind: 'level-up', level: 1 });
    await insertEvent(pato, { kind: 'level-up', level: 2, login: 'x' });
    const pond = createDrizzlePondStore(db);
    const first = await pond.listEvents({ viewerId: pato, page: 1 });
    expect(first.events).toHaveLength(19);
    expect(first.hasNext).toBe(true);
    const second = await pond.listEvents({ viewerId: pato, page: 2 });
    expect(second.events).toHaveLength(1);
    expect(second.hasNext).toBe(false);
  });

  it('nunca mostra eventos com mais de 90 dias, mesmo antes de se apagarem', async () => {
    const pato = await newUser(90001, 'pato-teste');
    await insertEvent(pato, { kind: 'level-up', level: 2 }, 91);
    const { events } = await createDrizzlePondStore(db).listEvents({ viewerId: pato, page: 1 });
    expect(events).toEqual([]);
  });

  it('os eventos de quem se escondeu só aparecem ao próprio', async () => {
    const garca = await newUser(90001, 'garca-teste', true);
    const pato = await newUser(90002, 'pato-teste');
    await insertEvent(garca, { kind: 'level-up', level: 2 });
    const pond = createDrizzlePondStore(db);
    expect((await pond.listEvents({ viewerId: pato, page: 1 })).events).toEqual([]);
    expect((await pond.listEvents({ viewerId: garca, page: 1 })).events).toHaveLength(1);
  });
});

it('apagar a conta apaga os eventos da pessoa', async () => {
  const pato = await newUser(90001, 'pato-teste');
  const cisne = await newUser(90002, 'cisne-teste');
  await insertEvent(pato, { kind: 'level-up', level: 2 });
  await insertEvent(cisne, { kind: 'level-up', level: 3 });
  await createDrizzleStore(db).deleteUser(pato);
  expect(await storedEvents()).toEqual([{ kind: 'level-up', level: 3 }]);
});

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

describe('Rubber Ducks', () => {
  async function eventOf(userId: string, daysAgo = 0): Promise<number> {
    await insertEvent(userId, { kind: 'level-up', level: 2 }, daysAgo);
    const { rows } = await client.query<{ id: number | string }>(
      'SELECT id FROM pond_events ORDER BY id DESC LIMIT 1'
    );
    const id = rows[0]?.id;
    if (id === undefined) throw new Error('sem evento');
    return Number(id);
  }

  async function duckCount(): Promise<number> {
    const { rows } = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM rubber_ducks'
    );
    return rows[0]?.n ?? 0;
  }

  it('o feed traz a contagem, o "já dei" e se o evento é do próprio', async () => {
    const pato = await newUser(90001, 'pato-teste');
    const cisne = await newUser(90002, 'cisne-teste');
    const garca = await newUser(90003, 'garca-teste', true);
    const event = await eventOf(pato);
    const pond = createDrizzlePondStore(db);
    // Quem se escondeu também dá Ducks, e contam.
    await pond.giveDuck({ userId: cisne, eventId: event });
    await pond.giveDuck({ userId: garca, eventId: event });

    const [seen] = (await pond.listEvents({ viewerId: cisne, page: 1 })).events;
    expect(seen).toMatchObject({ id: event, ducks: 2, ducked: true, own: false });
    const [own] = (await pond.listEvents({ viewerId: pato, page: 1 })).events;
    expect(own).toMatchObject({ ducks: 2, ducked: false, own: true });
  });

  it('dar duas vezes, mesmo em simultâneo, conta um; retirar sem ter dado não faz nada', async () => {
    const pato = await newUser(90001, 'pato-teste');
    const cisne = await newUser(90002, 'cisne-teste');
    const eventId = await eventOf(pato);
    const pond = createDrizzlePondStore(db);
    await Promise.all([
      pond.giveDuck({ userId: cisne, eventId }),
      pond.giveDuck({ userId: cisne, eventId }),
    ]);
    await pond.giveDuck({ userId: cisne, eventId });
    expect(await duckCount()).toBe(1);
    await pond.takeDuck({ userId: cisne, eventId });
    await pond.takeDuck({ userId: cisne, eventId });
    expect(await duckCount()).toBe(0);
  });

  it('a BD recusa um segundo Duck da mesma pessoa, mesmo sem o código', async () => {
    const pato = await newUser(90001, 'pato-teste');
    const cisne = await newUser(90002, 'cisne-teste');
    const eventId = await eventOf(pato);
    const insert = 'INSERT INTO rubber_ducks (event_id, user_id) VALUES ($1, $2)';
    await client.query(insert, [eventId, cisne]);
    await expect(client.query(insert, [eventId, cisne])).rejects.toThrow();
  });

  it('dar um Duck a um evento que já não existe não insere nada', async () => {
    const cisne = await newUser(90002, 'cisne-teste');
    await createDrizzlePondStore(db).giveDuck({ userId: cisne, eventId: 987_654 });
    expect(await duckCount()).toBe(0);
  });

  it('findVisibleEvent: o dono, ou null se expirou, não existe ou o dono se escondeu', async () => {
    const pato = await newUser(90001, 'pato-teste');
    const garca = await newUser(90003, 'garca-teste', true);
    const fresh = await eventOf(pato);
    const expired = await eventOf(pato, 91);
    const hidden = await eventOf(garca);
    const pond = createDrizzlePondStore(db);
    expect(await pond.findVisibleEvent({ viewerId: pato, eventId: fresh })).toEqual({
      ownerId: pato,
    });
    expect(await pond.findVisibleEvent({ viewerId: pato, eventId: expired })).toBeNull();
    expect(await pond.findVisibleEvent({ viewerId: pato, eventId: 987_654 })).toBeNull();
    expect(await pond.findVisibleEvent({ viewerId: pato, eventId: hidden })).toBeNull();
    expect(await pond.findVisibleEvent({ viewerId: garca, eventId: hidden })).toEqual({
      ownerId: garca,
    });
  });

  it('apagar a conta leva os Ducks que deu e os dos seus eventos; expirar leva os do evento', async () => {
    const pato = await newUser(90001, 'pato-teste');
    const cisne = await newUser(90002, 'cisne-teste');
    const pombo = await newUser(90004, 'pombo-teste');
    const pond = createDrizzlePondStore(db);
    const patoEvent = await eventOf(pato);
    const cisneEvent = await eventOf(cisne);
    const old = await eventOf(cisne, 91);
    await pond.giveDuck({ userId: cisne, eventId: patoEvent });
    await pond.giveDuck({ userId: pombo, eventId: patoEvent });
    await pond.giveDuck({ userId: pato, eventId: cisneEvent });
    await pond.giveDuck({ userId: pombo, eventId: cisneEvent });
    await client.query('INSERT INTO rubber_ducks (event_id, user_id) VALUES ($1, $2)', [
      old,
      pombo,
    ]);

    await createDrizzleStore(db).deleteUser(pato);
    const { rows } = await client.query<{ event_id: number | string; user_id: string }>(
      'SELECT event_id, user_id FROM rubber_ducks ORDER BY event_id'
    );
    expect(rows.map((r) => [Number(r.event_id), r.user_id])).toEqual([
      [cisneEvent, pombo],
      [old, pombo],
    ]);

    // A sincronização apaga os eventos expirados, e com eles os seus Ducks.
    await createDrizzlePassportStore(db).save(cisne, snapshot('cisne-teste'), NOW);
    expect(await duckCount()).toBe(1);
  });
});

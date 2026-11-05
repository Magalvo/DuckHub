// tests/acceptance/wi-0005-passaporte.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-04 (snapshot JSONB, sync no login, cor só decorativa, Lisboa).
// Revê antes do commit: depois de entrar, isto é o contrato. Dados inventados.
import { describe, expect, it } from 'vitest';

import { handleCallback, STATE_COOKIE, type AuthDeps } from '../../src/auth/handlers.js';
import type { Coalition, Profile, ProjectUser, Result } from '../../src/intra/client.js';
import {
  buildSnapshot,
  DEFAULT_ACCENT,
  passportView,
  type PassportSnapshot,
} from '../../src/passport/passport.js';
import { createPassportSync, type PassportStore } from '../../src/passport/sync.js';

// ---------- Fixtures sintéticas ----------

const piscine = { id: 9, slug: 'c-piscine', name: 'C Piscine', level: 8.42 };
const cursus42 = { id: 21, slug: '42cursus', name: '42cursus', level: 5.179 };

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 90001,
  login: 'pato-teste',
  imageUrl: 'https://cdn.example.test/pato-teste.jpg',
  primaryCampus: { id: 9001, name: 'Campus Sintético' },
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  cursus: [piscine, cursus42],
  ...overrides,
});

const coalitions: Coalition[] = [
  { id: 501, name: 'Os Patos', slug: 'os-patos', color: '#0E12B5' },
  { id: 502, name: 'Os Gansos', slug: 'os-gansos', color: '#FF6000' },
];

const project = (
  n: number,
  status: string,
  validated: boolean | null,
  finalMark: number | null
): ProjectUser => ({
  projectId: 1300 + n,
  name: `Projeto ${String(n)}`,
  slug: `projeto-${String(n)}`,
  status,
  finalMark,
  validated,
});

const projects: ProjectUser[] = [
  project(1, 'finished', true, 115),
  project(2, 'finished', false, 42),
  project(3, 'in_progress', null, null),
  project(4, 'waiting_for_correction', null, null),
];

// 2026-07-15 13:05 UTC = 14:05 em Lisboa (hora de verão)
const SUMMER = Date.UTC(2026, 6, 15, 13, 5);
// 2026-11-04 14:30 UTC = 14:30 em Lisboa (hora de inverno)
const WINTER = Date.UTC(2026, 10, 4, 14, 30);

describe('WI-0005 — snapshot e vista do Passaporte', () => {
  it('AC1: mostra login, foto, campus, Piscine, coalition e nível com 2 casas', () => {
    const view = passportView(buildSnapshot(profile(), coalitions, projects), WINTER);
    expect(view).toMatchObject({
      login: 'pato-teste',
      imageUrl: 'https://cdn.example.test/pato-teste.jpg',
      campus: 'Campus Sintético',
      piscine: { month: 'september', year: 2023 },
      coalitionName: 'Os Patos',
      reduced: false,
      mainCursus: { name: '42cursus', level: '5.17' }, // truncado, não arredondado
    });
  });

  it.each([
    [5.179, '5.17'],
    [5.999, '5.99'],
    [0, '0.00'],
    [12.5, '12.50'],
    [7.1, '7.10'],
  ])('AC1: o nível %d mostra-se como %s', (level, shown) => {
    const p = profile({ cursus: [{ ...cursus42, level }] });
    expect(passportView(buildSnapshot(p, [], []), WINTER).mainCursus?.level).toBe(shown);
  });

  it('AC2: a distinção Alumni vem só de isAlumni', () => {
    const alumni = passportView(buildSnapshot(profile({ isAlumni: true }), [], []), WINTER);
    const student = passportView(buildSnapshot(profile(), [], []), WINTER);
    expect(alumni.isAlumni).toBe(true);
    expect(student.isAlumni).toBe(false);
  });

  it('AC3: só com a Piscine, o Passaporte é reduzido e mostra a Piscine', () => {
    const view = passportView(buildSnapshot(profile({ cursus: [piscine] }), [], projects), WINTER);
    expect(view.reduced).toBe(true);
    expect(view.mainCursus).toEqual({ name: 'C Piscine', level: '8.42' });
    expect(view.projects).toHaveLength(projects.length);
  });

  it('AC4: o acento é a cor da primeira coalition e, sem coalition, o Cyber-Teal', () => {
    expect(DEFAULT_ACCENT).toBe('#00BABC');
    const withCoalition = passportView(buildSnapshot(profile(), coalitions, []), WINTER);
    const without = passportView(buildSnapshot(profile(), [], []), WINTER);
    expect(withCoalition.accentColor.toUpperCase()).toBe('#0E12B5');
    expect(without.accentColor).toBe(DEFAULT_ACCENT);
    expect(without.coalitionName).toBeNull();
  });

  it('AC5: concluído com nota, falhado e em curso distinguem-se', () => {
    const view = passportView(buildSnapshot(profile(), [], projects), WINTER);
    expect(view.projects).toEqual([
      { slug: 'projeto-1', name: 'Projeto 1', state: 'done', finalMark: 115 },
      { slug: 'projeto-2', name: 'Projeto 2', state: 'failed', finalMark: 42 },
      { slug: 'projeto-3', name: 'Projeto 3', state: 'in-progress', finalMark: null },
      { slug: 'projeto-4', name: 'Projeto 4', state: 'in-progress', finalMark: null },
    ]);
  });

  it.each([
    [SUMMER, '2026-07-15 14:05'],
    [WINTER, '2026-11-04 14:30'],
  ])('AC6: a data da sincronização mostra-se em Lisboa (%d → %s)', (at, shown) => {
    expect(passportView(buildSnapshot(profile(), [], []), at).syncedAt).toBe(shown);
  });

  it('AC8: o snapshot não guarda presença no campus nem blackhole', () => {
    const json = JSON.stringify(buildSnapshot(profile(), coalitions, projects)).toLowerCase();
    for (const forbidden of ['location', 'blackhole', 'logtime', 'host']) {
      expect(json).not.toContain(forbidden);
    }
  });
});

// ---------- Sincronização ----------

function memoryPassports() {
  const saved = new Map<string, { snapshot: PassportSnapshot; syncedAt: number }>();
  const store: PassportStore = {
    save: (userId, snapshot, syncedAt) => {
      saved.set(userId, { snapshot, syncedAt });
      return Promise.resolve();
    },
    load: (userId) => Promise.resolve(saved.get(userId) ?? null),
  };
  return { store, saved };
}

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const failed = <T>(): Result<T> => ({ ok: false, error: { kind: 'network' } });

function syncWith(api: {
  coalitions?: Result<Coalition[]>;
  projectsUsers?: Result<ProjectUser[]>;
}) {
  const mem = memoryPassports();
  const tokens: string[] = [];
  const sync = createPassportSync({
    client: (token) => {
      tokens.push(token);
      return {
        coalitions: () => Promise.resolve(api.coalitions ?? ok(coalitions)),
        projectsUsers: () => Promise.resolve(api.projectsUsers ?? ok(projects)),
      };
    },
    store: mem.store,
    clock: { now: () => WINTER },
  });
  return { sync, mem, tokens };
}

describe('WI-0005 — sincronização no login', () => {
  it('AC6: guarda o snapshot completo com a hora da sincronização', async () => {
    const { sync, mem, tokens } = syncWith({});
    await sync({ accessToken: 'token-sintetico', userId: 'user-1', profile: profile() });
    expect(tokens).toEqual(['token-sintetico']);
    expect(mem.saved.get('user-1')).toEqual({
      snapshot: buildSnapshot(profile(), coalitions, projects),
      syncedAt: WINTER,
    });
  });

  it.each([
    ['as coalitions falham', { coalitions: failed<Coalition[]>() }],
    ['os projetos falham', { projectsUsers: failed<ProjectUser[]>() }],
  ])('AC6: se %s, não guarda nada e mantém o snapshot anterior', async (_case, api) => {
    const { sync, mem } = syncWith(api);
    const previous = { snapshot: buildSnapshot(profile(), [], []), syncedAt: SUMMER };
    mem.saved.set('user-1', previous);
    await expect(
      sync({ accessToken: 't', userId: 'user-1', profile: profile() })
    ).resolves.toBeUndefined();
    expect(mem.saved.get('user-1')).toEqual(previous);
  });
});

// ---------- Ligação ao callback do WI-0004 ----------

function callbackDeps(options: { campusId: number; syncFails?: boolean }) {
  const synced: { accessToken: string; userId: string; login: string }[] = [];
  let sessions = 0;
  const p = profile({ primaryCampus: { id: options.campusId, name: 'Campus Sintético' } });
  const deps: AuthDeps = {
    config: {
      clientId: 'id',
      clientSecret: 'segredo-sintetico',
      redirectUri: 'http://localhost:3000/auth/callback',
      allowedCampusIds: [9001],
      secureCookies: false,
    },
    clock: { now: () => WINTER },
    randomToken: () => 'aleatorio-sintetico',
    exchangeCode: () => Promise.resolve({ ok: true, accessToken: 'token-sintetico' }),
    fetchProfile: () => Promise.resolve(ok(p)),
    syncPassport: ({ accessToken, userId, profile: synced_ }) => {
      synced.push({ accessToken, userId, login: synced_.login });
      return options.syncFails === true ? Promise.reject(new Error('falhou')) : Promise.resolve();
    },
    store: {
      upsertUser: () => Promise.resolve({ userId: 'user-1' }),
      createSession: () => {
        sessions += 1;
        return Promise.resolve();
      },
      findSession: () => Promise.resolve(null),
      renewSession: () => Promise.resolve(),
      deleteSession: () => Promise.resolve(),
      deleteUser: () => Promise.resolve(),
    },
  };
  return { deps, synced, sessions: () => sessions };
}

const callback = (deps: AuthDeps): Promise<Response> =>
  handleCallback(
    new Request('http://localhost:3000/auth/callback?code=c&state=s', {
      headers: { cookie: `${STATE_COOKIE}=s` },
    }),
    deps
  );

describe('WI-0005 — o login sincroniza o Passaporte', () => {
  it('AC6: um login aceite sincroniza com o token e o perfil do utilizador', async () => {
    const env = callbackDeps({ campusId: 9001 });
    const res = await callback(env.deps);
    expect(new URL(res.headers.get('location') ?? '', 'http://x').pathname).toBe('/');
    expect(env.synced).toEqual([
      { accessToken: 'token-sintetico', userId: 'user-1', login: 'pato-teste' },
    ]);
  });

  it('AC6: uma sincronização falhada não impede o login', async () => {
    const env = callbackDeps({ campusId: 9001, syncFails: true });
    const res = await callback(env.deps);
    expect(new URL(res.headers.get('location') ?? '', 'http://x').pathname).toBe('/');
    expect(env.sessions()).toBe(1);
  });

  it('AC6: um login recusado (campus) não sincroniza', async () => {
    const env = callbackDeps({ campusId: 4242 });
    await callback(env.deps);
    expect(env.synced).toEqual([]);
  });
});

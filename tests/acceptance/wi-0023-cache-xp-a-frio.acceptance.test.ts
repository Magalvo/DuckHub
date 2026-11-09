// tests/acceptance/wi-0023-cache-xp-a-frio.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-09: com a cache de XP vazia e a atualização ainda em curso, a
// calculadora e o The Tavern dizem "a carregar" em vez de "falhou"; o login
// aquece a cache do campus; uma atualização falhada regista uma linha só com o
// campus e o tipo da falha. Revê antes do commit: depois de entrar, isto é o
// contrato. Sem rede, sem BD e sem a 42 real: tudo é injetado. Dados inventados.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { handleCallback, STATE_COOKIE, type AuthDeps } from '../../src/auth/handlers.js';
import {
  createProjectXpCache,
  fetchFromApi,
  XP_FETCH_TIMEOUT_MS,
  type FetchProjects,
  type RefreshFailure,
} from '../../src/calculator/cache.js';
import type { CachedProjectXp, ProjectXp } from '../../src/calculator/store.js';
import { calculatorView } from '../../src/calculator/view.js';
import { en } from '../../src/i18n/messages/en.js';
import type { IntraClient, IntraError, Profile } from '../../src/intra/client.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';
import { realWorldSlugGroups } from '../../src/passport/real-world.js';
import { loadLobbyState, lobbyProjects } from '../../src/tavern/lobby.js';

const NOW = 2_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const CAMPUS = 9001;

const A: ProjectXp = { slug: 'projeto-a', projectId: 7001, name: 'Projeto A', xp: 500, solo: true };
const B: ProjectXp = {
  slug: 'projeto-b',
  projectId: 7002,
  name: 'Projeto B',
  xp: 900,
  solo: false,
};

const LINE =
  /^\[xp-cache\] refresh failed campus=\d+ reason=(token|rate-limited|http:\d{3}|network|invalid-response|empty|store)$/;

// ---------- Dublês ----------

/** Uma promessa que o teste resolve quando quiser: a "API lenta". */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Deixa correr as promessas pendentes (sem relógio real). */
const settle = async () => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

function setup(opts: {
  rows?: CachedProjectXp[];
  fetchProjects: FetchProjects;
  replaceFails?: boolean;
  loadFails?: boolean;
  deadlineMs?: number;
}) {
  let rows = opts.rows ?? [];
  const lines: string[] = [];
  const cache = createProjectXpCache({
    store: {
      load: () =>
        opts.loadFails === true
          ? Promise.reject(new Error('bd em baixo'))
          : Promise.resolve([...rows]),
      replace: (_campusId, projects, fetchedAt) => {
        if (opts.replaceFails === true) return Promise.reject(new Error('bd em baixo'));
        rows = projects.map((p) => ({ ...p, fetchedAt }));
        return Promise.resolve();
      },
    },
    fetchProjects: opts.fetchProjects,
    clock: { now: () => NOW },
    slugs: ['projeto-a', 'projeto-b'],
    deadlineMs: opts.deadlineMs ?? 20,
    log: (line) => {
      lines.push(line);
    },
  });
  return { cache, lines, rows: () => rows };
}

const ok = (projects: ProjectXp[]) => Promise.resolve({ ok: true as const, projects });
const fail = (reason: RefreshFailure) => Promise.resolve({ ok: false as const, reason });

// ---------- AC1, AC2, AC3: o estado da cache ----------

describe('WI-0023 — projectsFor com a cache a frio', () => {
  it('AC1: cache vazia e a API ainda a responder quando passa o teto: loading', async () => {
    const api = deferred<Awaited<ReturnType<FetchProjects>>>();
    const env = setup({ fetchProjects: () => api.promise });
    expect(await env.cache.projectsFor(CAMPUS)).toEqual({ kind: 'loading' });
    api.resolve({ ok: true, projects: [A] });
  });

  it('AC2: cache vazia e a atualização falhou: failed', async () => {
    const env = setup({ fetchProjects: () => fail('http:500') });
    expect(await env.cache.projectsFor(CAMPUS)).toEqual({ kind: 'failed' });
  });

  it('AC3: a atualização continua depois do teto, grava, e o pedido seguinte não chama a API', async () => {
    let calls = 0;
    const api = deferred<Awaited<ReturnType<FetchProjects>>>();
    const env = setup({
      fetchProjects: () => {
        calls += 1;
        return api.promise;
      },
    });
    expect(await env.cache.projectsFor(CAMPUS)).toEqual({ kind: 'loading' });
    api.resolve({ ok: true, projects: [B, A] });
    await settle();
    expect(env.rows().map((p) => p.slug)).toEqual(['projeto-b', 'projeto-a']);

    const next = await env.cache.projectsFor(CAMPUS);
    expect(next.kind).toBe('ready');
    if (next.kind === 'ready') {
      expect(next.projects.map((p) => p.slug)).toEqual(['projeto-a', 'projeto-b']);
    }
    expect(calls).toBe(1);
  });

  it('AC3: com linhas antigas e a API lenta, responde ready com as antigas', async () => {
    const api = deferred<Awaited<ReturnType<FetchProjects>>>();
    const env = setup({
      rows: [{ ...A, fetchedAt: NOW - 2 * DAY }],
      fetchProjects: () => api.promise,
    });
    const read = await env.cache.projectsFor(CAMPUS);
    expect(read.kind).toBe('ready');
    if (read.kind === 'ready') expect(read.projects.map((p) => p.slug)).toEqual(['projeto-a']);
    api.resolve({ ok: true, projects: [A] });
  });

  it('AC1: a calculadora sem projetos e com a atualização em curso diz loading', () => {
    const saved = {
      snapshot: {
        login: 'pato-teste',
        campus: 'Campus Sintético',
        piscine: { month: 'september', year: 2023 },
        isAlumni: false,
        coalition: null,
        cursus: [{ slug: '42cursus', name: '42cursus', level: 5.17 }],
        projects: [],
      } satisfies PassportSnapshot,
      syncedAt: NOW,
    };
    expect(calculatorView({ saved, projects: [], query: {}, loading: true })).toEqual({
      kind: 'loading',
    });
    // AC2: sem atualização em curso, continua a ser no-data
    expect(calculatorView({ saved, projects: [], query: {}, loading: false })).toEqual({
      kind: 'no-data',
    });
    expect(calculatorView({ saved, projects: [], query: {} })).toEqual({ kind: 'no-data' });
  });

  it('AC1, AC4: as mensagens de loading existem e são diferentes das de falha', () => {
    expect(en.calculator.loading.trim()).not.toBe('');
    expect(en.calculator.loading).not.toBe(en.calculator.noData);
    expect(en.tavern.lobby.loading.trim()).not.toBe('');
    expect(en.tavern.lobby.loading).not.toBe(en.tavern.lobby.noProjects);
  });
});

// ---------- AC4: o The Tavern ----------

describe('WI-0023 — loadLobbyState', () => {
  const snapshot: PassportSnapshot = {
    login: 'pato-teste',
    campus: 'Campus Sintético',
    piscine: { month: 'september', year: 2023 },
    isAlumni: false,
    coalition: null,
    cursus: [{ slug: '42cursus', name: '42cursus', level: 6.1 }],
    projects: [],
  };
  const deps = (catalog: Awaited<ReturnType<Parameters<typeof loadLobbyState>[1]['catalog']>>) => ({
    loadSnapshot: () => Promise.resolve(snapshot),
    campusOf: () => Promise.resolve(CAMPUS),
    catalog: () => Promise.resolve(catalog),
  });

  it('AC4: com o catálogo em loading, o estado é loading', async () => {
    expect(await loadLobbyState('user-1', deps({ kind: 'loading' }))).toEqual({ kind: 'loading' });
  });

  it('AC4: com o catálogo pronto, os lobbies são os de lobbyProjects', async () => {
    const projects = [{ ...B, fetchedAt: NOW }];
    expect(await loadLobbyState('user-1', deps({ kind: 'ready', projects }))).toEqual({
      kind: 'ready',
      projects: lobbyProjects(snapshot, projects, realWorldSlugGroups),
    });
  });

  it('AC4: com o catálogo falhado, fica a lista vazia (noProjects, como hoje)', async () => {
    expect(await loadLobbyState('user-1', deps({ kind: 'failed' }))).toEqual({
      kind: 'ready',
      projects: [],
    });
  });
});

// ---------- AC5: o aquecimento ----------

describe('WI-0023 — warm', () => {
  it('AC5: com a cache vazia, chama a API uma vez e grava', async () => {
    let calls = 0;
    const env = setup({
      fetchProjects: () => {
        calls += 1;
        return ok([A]);
      },
    });
    env.cache.warm(CAMPUS);
    // warm não espera pela API: logo a seguir, ainda nada foi gravado.
    expect(env.rows()).toEqual([]);
    await settle();
    expect(calls).toBe(1);
    expect(env.rows().map((p) => p.slug)).toEqual(['projeto-a']);
  });

  it('AC5: com a cache fresca (menos de 24 h), não chama a API', async () => {
    let calls = 0;
    const env = setup({
      rows: [{ ...A, fetchedAt: NOW - DAY + 1000 }],
      fetchProjects: () => {
        calls += 1;
        return ok([A]);
      },
    });
    env.cache.warm(CAMPUS);
    await settle();
    expect(calls).toBe(0);
  });

  it('AC5: warm e projectsFor ao mesmo tempo partilham uma só chamada à API', async () => {
    let calls = 0;
    const api = deferred<Awaited<ReturnType<FetchProjects>>>();
    const env = setup({
      fetchProjects: () => {
        calls += 1;
        return api.promise;
      },
    });
    env.cache.warm(CAMPUS);
    await settle();
    expect(await env.cache.projectsFor(CAMPUS)).toEqual({ kind: 'loading' });
    api.resolve({ ok: true, projects: [A] });
    await settle();
    expect(calls).toBe(1);
  });

  it('AC5: warm nunca lança nem deixa uma rejeição por tratar, mesmo com a BD em baixo', async () => {
    const env = setup({ loadFails: true, fetchProjects: () => ok([A]) });
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      expect(() => {
        env.cache.warm(CAMPUS);
      }).not.toThrow();
      await new Promise((r) => setTimeout(r, 20));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    expect(unhandled).toEqual([]);
  });
});

// ---------- AC5: o login aquece a cache ----------

const profile: Profile = {
  id: 90001,
  login: 'pato-teste',
  imageUrl: null,
  primaryCampus: { id: CAMPUS, name: 'Campus Sintético' },
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  cursus: [{ id: 21, slug: '42cursus', name: '42cursus', level: 5.17 }],
};

function callbackDeps(warm?: (campusId: number) => void) {
  const order: string[] = [];
  let sessions = 0;
  const base: AuthDeps = {
    config: {
      clientId: 'id',
      clientSecret: 'segredo-sintetico',
      redirectUri: 'http://localhost:3000/auth/callback',
      allowedCampusIds: [CAMPUS],
      secureCookies: false,
    },
    clock: { now: () => NOW },
    randomToken: () => 'aleatorio-sintetico',
    exchangeCode: () => Promise.resolve({ ok: true, accessToken: 'token-sintetico' }),
    fetchProfile: () => Promise.resolve({ ok: true, value: profile }),
    syncPassport: () => {
      order.push('sync');
      return Promise.resolve();
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
  const deps: AuthDeps =
    warm === undefined
      ? base
      : {
          ...base,
          warmXpCache: (campusId) => {
            order.push(`warm:${String(campusId)}`);
            warm(campusId);
          },
        };
  return { deps, order, sessions: () => sessions };
}

const callback = (deps: AuthDeps): Promise<Response> =>
  handleCallback(
    new Request('http://localhost:3000/auth/callback?code=c&state=s', {
      headers: { cookie: `${STATE_COOKIE}=s` },
    }),
    deps
  );

const landed = (res: Response) => new URL(res.headers.get('location') ?? '', 'http://x').pathname;

describe('WI-0023 — o login aquece a cache de XP', () => {
  it('AC5: um login aceite aquece o campus do perfil, depois da sincronização', async () => {
    const env = callbackDeps(() => undefined);
    const res = await callback(env.deps);
    expect(landed(res)).toBe('/');
    expect(env.order).toEqual(['sync', `warm:${String(CAMPUS)}`]);
  });

  it('AC5: um aquecimento que lança não impede o login', async () => {
    const env = callbackDeps(() => {
      throw new Error('falhou');
    });
    const res = await callback(env.deps);
    expect(landed(res)).toBe('/');
    expect(env.sessions()).toBe(1);
  });

  it('AC5: sem warmXpCache, o login funciona como antes', async () => {
    const env = callbackDeps();
    const res = await callback(env.deps);
    expect(landed(res)).toBe('/');
    expect(env.order).toEqual(['sync']);
  });
});

// ---------- AC6, AC7: o registo ----------

describe('WI-0023 — registo das falhas', () => {
  it.each<RefreshFailure>(['token', 'rate-limited', 'http:429', 'network', 'invalid-response'])(
    'AC6: uma falha %s regista uma só linha com o campus e o tipo',
    async (reason) => {
      const env = setup({ fetchProjects: () => fail(reason) });
      await env.cache.projectsFor(CAMPUS);
      await settle();
      expect(env.lines).toEqual([
        `[xp-cache] refresh failed campus=${String(CAMPUS)} reason=${reason}`,
      ]);
    }
  );

  it('AC6: uma lista vazia regista empty e não apaga nada', async () => {
    const env = setup({ fetchProjects: () => ok([]) });
    await env.cache.projectsFor(CAMPUS);
    await settle();
    expect(env.lines).toEqual([`[xp-cache] refresh failed campus=${String(CAMPUS)} reason=empty`]);
  });

  it('AC6: uma exceção da API conta como network', async () => {
    const env = setup({ fetchProjects: () => Promise.reject(new Error('pato-teste token=x')) });
    await env.cache.projectsFor(CAMPUS);
    await settle();
    expect(env.lines).toEqual([
      `[xp-cache] refresh failed campus=${String(CAMPUS)} reason=network`,
    ]);
  });

  it('AC6: uma falha a gravar regista store', async () => {
    const env = setup({ fetchProjects: () => ok([A]), replaceFails: true });
    await env.cache.projectsFor(CAMPUS);
    await settle();
    expect(env.lines).toEqual([`[xp-cache] refresh failed campus=${String(CAMPUS)} reason=store`]);
  });

  it('AC6: qualquer falha dá exatamente uma linha no formato, e nunca mais nada', async () => {
    const reasons = fc.oneof(
      fc.constantFrom<RefreshFailure>('token', 'rate-limited', 'network', 'invalid-response'),
      fc.integer({ min: 400, max: 599 }).map((s): RefreshFailure => `http:${String(s)}`)
    );
    await fc.assert(
      fc.asyncProperty(reasons, fc.integer({ min: 1, max: 99_999 }), async (reason, campus) => {
        const env = setup({ fetchProjects: () => fail(reason) });
        await env.cache.projectsFor(campus);
        await settle();
        expect(env.lines).toHaveLength(1);
        expect(env.lines[0]).toMatch(LINE);
        expect(env.lines[0]).toContain(`campus=${String(campus)} `);
      }),
      { numRuns: 200 }
    );
  });

  it('AC7: uma atualização com sucesso não regista nada', async () => {
    const env = setup({ fetchProjects: () => ok([A, B]) });
    expect((await env.cache.projectsFor(CAMPUS)).kind).toBe('ready');
    await settle();
    expect(env.lines).toEqual([]);
  });
});

// ---------- AC6: o tipo da falha vem da API ----------

describe('WI-0023 — fetchFromApi devolve o tipo da falha', () => {
  const client =
    (result: Awaited<ReturnType<IntraClient['cursusProjects']>>) =>
    (): Pick<IntraClient, 'cursusProjects'> => ({
      cursusProjects: () => Promise.resolve(result),
    });
  const token = () => Promise.resolve({ ok: true as const, token: 't' });

  it('AC6: sem token da aplicação, token', async () => {
    const fetch = fetchFromApi({
      appToken: () => Promise.resolve({ ok: false }),
      client: client({ ok: true, value: [] }),
      slugs: ['projeto-a'],
    });
    expect(await fetch(CAMPUS)).toEqual({ ok: false, reason: 'token' });
  });

  it.each<[IntraError, RefreshFailure]>([
    [{ kind: 'rate-limited' }, 'rate-limited'],
    [{ kind: 'http', status: 503 }, 'http:503'],
    [{ kind: 'network' }, 'network'],
    [{ kind: 'invalid-response', issues: ['pato-teste: campo em falta'] }, 'invalid-response'],
  ])('AC6: o erro %j da API dá %s', async (error, reason) => {
    const fetch = fetchFromApi({
      appToken: token,
      client: client({ ok: false, error }),
      slugs: ['projeto-a'],
    });
    expect(await fetch(CAMPUS)).toEqual({ ok: false, reason });
  });

  it('com sucesso, devolve os projetos', async () => {
    const fetch = fetchFromApi({
      appToken: token,
      client: client({ ok: true, value: [{ ...A }] }),
      slugs: ['projeto-a'],
    });
    expect(await fetch(CAMPUS)).toEqual({ ok: true, projects: [A] });
  });
});

// ---------- AC8 ----------

describe('WI-0023 — timeout do pedido da lista de projetos', () => {
  it('AC8: pelo menos 30 s, acima dos ~12 s medidos a 2026-11-09', () => {
    expect(XP_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
  });
});

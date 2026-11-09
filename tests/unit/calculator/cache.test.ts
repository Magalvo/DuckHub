// Cache de XP (WI-0007, WI-0023). Store, API e relógio falsos; dados inventados.
import { describe, expect, it } from 'vitest';

import {
  CACHE_TTL_MS,
  createProjectXpCache,
  fetchFromApi,
  isStale,
  MAIN_CURSUS_ID,
  type CacheRead,
  type FetchProjects,
} from '../../../src/calculator/cache.js';
import type { CachedProjectXp, ProjectXp } from '../../../src/calculator/store.js';
import type { IntraClient } from '../../../src/intra/client.js';

const NOW = 2_000_000_000_000;
const A: ProjectXp = { slug: 'projeto-a', projectId: 7001, name: 'Projeto A', xp: 500, solo: true };
// WI-0017: o solo passa da API para a cache.
const B: ProjectXp = {
  slug: 'projeto-b',
  projectId: 7002,
  name: 'Projeto B',
  xp: 900,
  solo: false,
};

function memoryStore(initial: Record<number, CachedProjectXp[]> = {}) {
  const rows = new Map(Object.entries(initial).map(([k, v]) => [Number(k), v]));
  let replaced = 0;
  return {
    load: (campusId: number) => Promise.resolve([...(rows.get(campusId) ?? [])]),
    replace: (campusId: number, projects: readonly ProjectXp[], fetchedAt: number) => {
      replaced += 1;
      rows.set(
        campusId,
        projects.map((p) => ({ ...p, fetchedAt }))
      );
      return Promise.resolve();
    },
    replaced: () => replaced,
  };
}

function setup(opts: {
  rows?: Record<number, CachedProjectXp[]>;
  fetchProjects: FetchProjects;
  deadlineMs?: number;
}) {
  const store = memoryStore(opts.rows);
  const lines: string[] = [];
  const cache = createProjectXpCache({
    store,
    fetchProjects: opts.fetchProjects,
    clock: { now: () => NOW },
    slugs: ['projeto-b', 'projeto-a'],
    deadlineMs: opts.deadlineMs ?? 1000,
    log: (line) => {
      lines.push(line);
    },
  });
  return { cache, store, lines };
}

const at = (p: ProjectXp, fetchedAt: number): CachedProjectXp => ({ ...p, fetchedAt });
const ok = (projects: ProjectXp[]) => Promise.resolve({ ok: true as const, projects });
const failed = () => Promise.resolve({ ok: false as const, reason: 'network' as const });

/** As linhas de um CacheRead, ou null se não estiver pronto. */
const ready = async (read: Promise<CacheRead>): Promise<CachedProjectXp[] | null> => {
  const r = await read;
  return r.kind === 'ready' ? r.projects : null;
};

describe('isStale', () => {
  it('sem linhas, ou com a mais antiga com mais de 24 h', () => {
    expect(isStale([], NOW)).toBe(true);
    expect(isStale([at(A, NOW - CACHE_TTL_MS)], NOW)).toBe(false);
    expect(isStale([at(A, NOW), at(B, NOW - CACHE_TTL_MS - 1)], NOW)).toBe(true);
  });
});

describe('createProjectXpCache', () => {
  it('cache fresca: responde dela, sem chamar a API, pela ordem dos slugs', async () => {
    let calls = 0;
    const env = setup({
      rows: { 9001: [at(A, NOW - 1000), at(B, NOW - 1000)] },
      fetchProjects: () => {
        calls += 1;
        return failed();
      },
    });
    expect((await ready(env.cache.projectsFor(9001)))?.map((p) => p.slug)).toEqual([
      'projeto-b',
      'projeto-a',
    ]);
    expect(calls).toBe(0);
  });

  it('campus sem linhas: atualiza antes de responder, só para esse campus', async () => {
    const campuses: number[] = [];
    const env = setup({
      rows: { 9002: [at(A, NOW)] },
      fetchProjects: (campusId) => {
        campuses.push(campusId);
        return ok([A, B]);
      },
    });
    expect(await ready(env.cache.projectsFor(9001))).toEqual([at(B, NOW), at(A, NOW)]);
    expect(campuses).toEqual([9001]);
  });

  it('linha com mais de 24 h: atualiza a cache toda do campus', async () => {
    const env = setup({
      rows: { 9001: [at(A, NOW), at(B, NOW - CACHE_TTL_MS - 1)] },
      fetchProjects: () => ok([{ ...A, xp: 550 }]),
    });
    expect(await ready(env.cache.projectsFor(9001))).toEqual([at({ ...A, xp: 550 }, NOW)]);
  });

  it.each([
    ['a API falha', failed],
    ['a API devolve uma lista vazia', () => ok([])],
    ['a leitura lança', () => Promise.reject(new Error('rede'))],
  ] as const)('se %s, fica a cache que houver', async (_, fetchProjects) => {
    const old = [at(A, NOW - CACHE_TTL_MS - 1)];
    const env = setup({ rows: { 9001: old }, fetchProjects });
    expect(await env.cache.projectsFor(9001)).toEqual({ kind: 'ready', projects: old });
    // Sem cache nenhuma e sem atualização em curso: failed (WI-0023).
    expect(await env.cache.projectsFor(9002)).toEqual({ kind: 'failed' });
    expect(env.store.replaced()).toBe(0);
    expect(env.lines).toHaveLength(2);
  });

  it('pedidos em simultâneo partilham uma só atualização', async () => {
    let calls = 0;
    const env = setup({
      fetchProjects: () => {
        calls += 1;
        return ok([A]);
      },
    });
    await Promise.all([env.cache.projectsFor(9001), env.cache.projectsFor(9001)]);
    expect(calls).toBe(1);
  });

  it('passado o teto, responde com a cache que houver e a atualização acaba depois', async () => {
    let finish: (v: { ok: true; projects: ProjectXp[] }) => void = () => undefined;
    const env = setup({
      rows: { 9001: [at(A, NOW - CACHE_TTL_MS - 1)] },
      fetchProjects: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
      deadlineMs: 5,
    });
    expect(await ready(env.cache.projectsFor(9001))).toEqual([at(A, NOW - CACHE_TTL_MS - 1)]);
    finish({ ok: true, projects: [B] });
    await new Promise((r) => setTimeout(r, 0));
    expect(await ready(env.cache.projectsFor(9001))).toEqual([at(B, NOW)]);
  });
});

describe('warm (WI-0023)', () => {
  it('com a cache antiga, atualiza em fundo', async () => {
    const env = setup({
      rows: { 9001: [at(A, NOW - CACHE_TTL_MS - 1)] },
      fetchProjects: () => ok([B]),
    });
    env.cache.warm(9001);
    await new Promise((r) => setTimeout(r, 0));
    expect(await ready(env.cache.projectsFor(9001))).toEqual([at(B, NOW)]);
  });

  it('uma falha do aquecimento regista a linha, como no projectsFor', async () => {
    const env = setup({ fetchProjects: failed });
    env.cache.warm(9001);
    await new Promise((r) => setTimeout(r, 0));
    expect(env.lines).toEqual(['[xp-cache] refresh failed campus=9001 reason=network']);
  });
});

describe('fetchFromApi', () => {
  const projects = [{ ...A }, { ...B }];
  const client =
    (seen: unknown[]) =>
    (token: string): Pick<IntraClient, 'cursusProjects'> => ({
      cursusProjects: (cursusId, slugs, ctx) => {
        seen.push({ token, cursusId, slugs, ctx });
        return Promise.resolve({ ok: true, value: projects });
      },
    });

  it('pede o token da aplicação e a lista do 42cursus com os slugs, para o campus', async () => {
    const seen: unknown[] = [];
    const fetch = fetchFromApi({
      appToken: () => Promise.resolve({ ok: true, token: 'app-sintetico' }),
      client: client(seen),
      slugs: ['projeto-a'],
    });
    expect(await fetch(9001)).toEqual({ ok: true, projects: [A, B] });
    expect(seen).toEqual([
      {
        token: 'app-sintetico',
        cursusId: MAIN_CURSUS_ID,
        slugs: ['projeto-a'],
        ctx: { campusId: 9001 },
      },
    ]);
  });

  it('sem token, não chama a API e devolve token', async () => {
    const seen: unknown[] = [];
    const fetch = fetchFromApi({
      appToken: () => Promise.resolve({ ok: false }),
      client: client(seen),
      slugs: ['projeto-a'],
    });
    expect(await fetch(9001)).toEqual({ ok: false, reason: 'token' });
    expect(seen).toEqual([]);
  });

  it('uma falha da API devolve o tipo da falha', async () => {
    const fetch = fetchFromApi({
      appToken: () => Promise.resolve({ ok: true, token: 'app-sintetico' }),
      client: () => ({
        cursusProjects: () => Promise.resolve({ ok: false, error: { kind: 'network' } }),
      }),
      slugs: ['projeto-a'],
    });
    expect(await fetch(9001)).toEqual({ ok: false, reason: 'network' });
  });
});

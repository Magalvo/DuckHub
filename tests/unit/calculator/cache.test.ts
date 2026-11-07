// Cache de XP (WI-0007). Store, API e relógio falsos; dados inventados.
import { describe, expect, it } from 'vitest';

import {
  CACHE_TTL_MS,
  createProjectXpCache,
  fetchFromApi,
  isStale,
  MAIN_CURSUS_ID,
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
  const cache = createProjectXpCache({
    store,
    fetchProjects: opts.fetchProjects,
    clock: { now: () => NOW },
    slugs: ['projeto-b', 'projeto-a'],
    deadlineMs: opts.deadlineMs ?? 1000,
  });
  return { cache, store };
}

const at = (p: ProjectXp, fetchedAt: number): CachedProjectXp => ({ ...p, fetchedAt });

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
        return Promise.resolve(null);
      },
    });
    expect((await env.cache.projectsFor(9001)).map((p) => p.slug)).toEqual([
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
        return Promise.resolve([A, B]);
      },
    });
    expect(await env.cache.projectsFor(9001)).toEqual([at(B, NOW), at(A, NOW)]);
    expect(campuses).toEqual([9001]);
  });

  it('linha com mais de 24 h: atualiza a cache toda do campus', async () => {
    const env = setup({
      rows: { 9001: [at(A, NOW), at(B, NOW - CACHE_TTL_MS - 1)] },
      fetchProjects: () => Promise.resolve([{ ...A, xp: 550 }]),
    });
    expect(await env.cache.projectsFor(9001)).toEqual([at({ ...A, xp: 550 }, NOW)]);
  });

  it.each([
    ['a API falha', () => Promise.resolve(null)],
    ['a API devolve uma lista vazia', () => Promise.resolve([])],
    ['a leitura lança', () => Promise.reject(new Error('rede'))],
  ] as const)('se %s, fica a cache que houver', async (_, fetchProjects) => {
    const old = [at(A, NOW - CACHE_TTL_MS - 1)];
    const env = setup({ rows: { 9001: old }, fetchProjects });
    expect(await env.cache.projectsFor(9001)).toEqual(old);
    expect(await env.cache.projectsFor(9002)).toEqual([]);
    expect(env.store.replaced()).toBe(0);
  });

  it('pedidos em simultâneo partilham uma só atualização', async () => {
    let calls = 0;
    const env = setup({
      fetchProjects: () => {
        calls += 1;
        return Promise.resolve([A]);
      },
    });
    await Promise.all([env.cache.projectsFor(9001), env.cache.projectsFor(9001)]);
    expect(calls).toBe(1);
  });

  it('passado o teto, responde com a cache que houver e a atualização acaba depois', async () => {
    let finish: (v: ProjectXp[]) => void = () => undefined;
    const env = setup({
      rows: { 9001: [at(A, NOW - CACHE_TTL_MS - 1)] },
      fetchProjects: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
      deadlineMs: 5,
    });
    expect(await env.cache.projectsFor(9001)).toEqual([at(A, NOW - CACHE_TTL_MS - 1)]);
    finish([B]);
    await new Promise((r) => setTimeout(r, 0));
    expect(await env.cache.projectsFor(9001)).toEqual([at(B, NOW)]);
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
    expect(await fetch(9001)).toEqual([A, B]);
    expect(seen).toEqual([
      {
        token: 'app-sintetico',
        cursusId: MAIN_CURSUS_ID,
        slugs: ['projeto-a'],
        ctx: { campusId: 9001 },
      },
    ]);
  });

  it('sem token, não chama a API e devolve null', async () => {
    const seen: unknown[] = [];
    const fetch = fetchFromApi({
      appToken: () => Promise.resolve({ ok: false }),
      client: client(seen),
      slugs: ['projeto-a'],
    });
    expect(await fetch(9001)).toBeNull();
    expect(seen).toEqual([]);
  });

  it('uma falha da API devolve null', async () => {
    const fetch = fetchFromApi({
      appToken: () => Promise.resolve({ ok: true, token: 'app-sintetico' }),
      client: () => ({
        cursusProjects: () => Promise.resolve({ ok: false, error: { kind: 'network' } }),
      }),
      slugs: ['projeto-a'],
    });
    expect(await fetch(9001)).toBeNull();
  });
});

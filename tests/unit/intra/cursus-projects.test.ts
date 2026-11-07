// Método cursusProjects do cliente (WI-0007). Dados inventados (regra 9).
import { describe, expect, it } from 'vitest';

import { createIntraClient, type IntraFetch } from '../../../src/intra/client.js';

const TOKEN = 'TOKEN-SINTETICO-c0de';
const clock = { now: () => 0, sleep: () => Promise.resolve() };
const limiter = { acquire: () => Promise.resolve(), pause: () => undefined };

const project = (over: Record<string, unknown> = {}) => ({
  id: 7001,
  name: 'Projeto A',
  slug: 'projeto-a',
  difficulty: 500,
  project_sessions: [
    { campus_id: 9001, cursus_id: 21, difficulty: 600 },
    { campus_id: 9001, cursus_id: 99, difficulty: 700 },
    { campus_id: 9002, cursus_id: 21, difficulty: 800 },
  ],
  ...over,
});

function setup(pages: Response[]) {
  const urls: URL[] = [];
  const auth: string[] = [];
  const fetch: IntraFetch = (url, init) => {
    urls.push(new URL(url));
    auth.push(init.headers.Authorization ?? '');
    const next = pages.shift();
    return Promise.resolve(next ?? new Response('', { status: 404 }));
  };
  return { client: createIntraClient({ token: TOKEN, fetch, clock, limiter }), urls, auth };
}

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers });

describe('cursusProjects', () => {
  it('faz um GET à lista do cursus filtrada pelos slugs, com 100 por página', async () => {
    const env = setup([json([project()])]);
    await env.client.cursusProjects(21, ['projeto-a', 'projeto-b'], { campusId: 9001 });
    const [url] = env.urls;
    expect(`${url?.origin ?? ''}${url?.pathname ?? ''}`).toBe(
      'https://api.intra.42.fr/v2/cursus/21/projects'
    );
    expect(url?.searchParams.get('filter[slug]')).toBe('projeto-a,projeto-b');
    expect(url?.searchParams.get('page[size]')).toBe('100');
    expect(env.auth).toEqual([`Bearer ${TOKEN}`]);
  });

  it('o XP é o da sessão do mesmo campus e cursus, senão o do projeto', async () => {
    const env = setup([
      json([
        project(),
        project({ id: 7002, slug: 'projeto-b', name: 'Projeto B', project_sessions: [] }),
        project({
          id: 7003,
          slug: 'projeto-c',
          name: 'Projeto C',
          project_sessions: [{ campus_id: 9001, cursus_id: 21, difficulty: null }],
        }),
      ]),
    ]);
    expect(await env.client.cursusProjects(21, ['x'], { campusId: 9001 })).toEqual({
      ok: true,
      value: [
        { projectId: 7001, slug: 'projeto-a', name: 'Projeto A', xp: 600, solo: true },
        { projectId: 7002, slug: 'projeto-b', name: 'Projeto B', xp: 500, solo: true },
        { projectId: 7003, slug: 'projeto-c', name: 'Projeto C', xp: 500, solo: true },
      ],
    });
  });

  it('o solo (WI-0017) vem da sessão do campus, senão da sessão sem campus; sem ela, a solo', async () => {
    const env = setup([
      json([
        project({
          project_sessions: [
            { campus_id: 9001, cursus_id: 21, difficulty: 600, solo: false },
            { campus_id: null, cursus_id: null, difficulty: null, solo: true },
          ],
        }),
        project({
          id: 7002,
          slug: 'projeto-b',
          name: 'Projeto B',
          project_sessions: [
            { campus_id: 9002, cursus_id: 21, difficulty: null, solo: true },
            { campus_id: null, cursus_id: null, difficulty: null, solo: false },
          ],
        }),
        project({
          id: 7003,
          slug: 'projeto-c',
          name: 'Projeto C',
          project_sessions: [{ campus_id: 9001, cursus_id: 21, difficulty: null, solo: null }],
        }),
      ]),
    ]);
    const result = await env.client.cursusProjects(21, ['x'], { campusId: 9001 });
    expect(result.ok && result.value.map((p) => [p.slug, p.solo])).toEqual([
      ['projeto-a', false],
      ['projeto-b', false],
      ['projeto-c', true],
    ]);
  });

  it('segue o header Link para a página seguinte', async () => {
    const next =
      'https://api.intra.42.fr/v2/cursus/21/projects?filter[slug]=x&page[size]=100&page[number]=2';
    const env = setup([
      json([project()], { link: `<${next}>; rel="next"` }),
      json([project({ id: 7002, slug: 'projeto-b' })]),
    ]);
    const result = await env.client.cursusProjects(21, ['x'], { campusId: 9002 });
    expect(result.ok && result.value.map((p) => [p.slug, p.xp])).toEqual([
      ['projeto-a', 800],
      ['projeto-b', 800],
    ]);
    expect(env.urls).toHaveLength(2);
  });

  it('uma resposta fora do schema é invalid-response, sem valores', async () => {
    const env = setup([json([project({ difficulty: 'SEGREDO-NA-RESPOSTA' })])]);
    const result = await env.client.cursusProjects(21, ['x'], { campusId: 9001 });
    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response', issues: ['0.difficulty: invalid_type'] },
    });
    expect(JSON.stringify(result)).not.toContain('SEGREDO');
  });
});

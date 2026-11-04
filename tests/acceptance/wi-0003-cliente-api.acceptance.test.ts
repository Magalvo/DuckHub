// tests/acceptance/wi-0003-cliente-api.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// (AC3, AC5, AC7) de 2026-10-30. Revê antes do commit: depois de entrar, isto é
// o contrato.
// Todos os dados são inventados (regra dura 9): nenhuma resposta real da Intra.
import { inspect } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createIntraClient,
  createRateLimiter,
  type Clock,
  type IntraFetch,
} from '../../src/intra/client.js';

const TOKEN = 'TOKEN-SINTETICO-7f3a';
const USER_ID = 90001;

// ---------- Dublês: relógio falso e API falsa ----------

/**
 * Relógio virtual: sleep() não espera de verdade. O tempo só avança quando todo
 * o trabalho pendente (microtasks) terminou, e salta para o próximo despertar.
 * Assim, pedidos em paralelo veem o mesmo tempo que veriam com um relógio real.
 */
function fakeClock(): Clock {
  let t = 0;
  let scheduled = false;
  const sleepers: { wake: number; resolve: () => void }[] = [];
  const tick = (): void => {
    scheduled = false;
    if (sleepers.length === 0) return;
    t = Math.max(t, Math.min(...sleepers.map((s) => s.wake)));
    for (const s of sleepers.filter((x) => x.wake <= t)) {
      sleepers.splice(sleepers.indexOf(s), 1);
      s.resolve();
    }
    schedule();
  };
  const schedule = (): void => {
    if (!scheduled && sleepers.length > 0) {
      scheduled = true;
      setImmediate(tick);
    }
  };
  return {
    now: () => t,
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        sleepers.push({ wake: t + ms, resolve });
        schedule();
      }),
  };
}

interface Call {
  readonly url: URL;
  readonly method: string;
  readonly at: number;
}

const json = (body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });

const notFound = (): Response => new Response('', { status: 404 });

/** Cliente ligado a uma API falsa; regista cada pedido com o instante em que saiu. */
function setup(route: (url: URL) => Response | Promise<Response>) {
  const clock = fakeClock();
  const limiter = createRateLimiter({ clock });
  const calls: Call[] = [];
  const fetch: IntraFetch = (url, init) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, method: init.method, at: clock.now() });
    return Promise.resolve(route(parsed));
  };
  const client = createIntraClient({ token: TOKEN, fetch, clock, limiter });
  return { client, calls, clock, limiter, fetch };
}

// ---------- Fixtures sintéticas ----------

const me = {
  id: USER_ID,
  login: 'pato-teste',
  image: { link: 'https://cdn.example.test/pato-teste.jpg' },
  pool_month: 'september',
  pool_year: '2023',
  'alumni?': false,
  campus: [
    { id: 9001, name: 'Campus Sintético A' },
    { id: 9002, name: 'Campus Sintético B' },
  ],
  campus_users: [
    { campus_id: 9001, is_primary: false },
    { campus_id: 9002, is_primary: true },
  ],
  cursus_users: [
    { level: 8.42, cursus: { id: 9, name: 'C Piscine', slug: 'c-piscine' } },
    { level: 5.17, cursus: { id: 21, name: '42cursus', slug: '42cursus' } },
  ],
};

const coalitions = [{ id: 501, name: 'Os Patos', slug: 'os-patos', color: '#00BABC', score: 1234 }];

const projectUser = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: 7000 + n,
  final_mark: 100,
  status: 'finished',
  'validated?': true,
  project: { id: 1300 + n, name: `Projeto ${String(n)}`, slug: `projeto-${String(n)}` },
  ...overrides,
});

const project = {
  id: 1314,
  name: 'Projeto Sintético',
  slug: 'projeto-sintetico',
  difficulty: 4200,
  project_sessions: [
    { id: 1, project_id: 1314, campus_id: 9002, cursus_id: 21, difficulty: 9450 },
    { id: 2, project_id: 1314, campus_id: 9001, cursus_id: 21, difficulty: 7000 },
  ],
};

/** Rotas da API falsa. Aceita query strings (page, page[size], ...). */
function api(url: URL): Response {
  const path = url.pathname;
  if (path === '/v2/me') return json(me);
  if (path === `/v2/users/${String(USER_ID)}/coalitions`) return json(coalitions);
  if (path === `/v2/users/${String(USER_ID)}/projects_users`)
    return json([
      projectUser(1),
      projectUser(2, { final_mark: null, status: 'in_progress', 'validated?': null }),
    ]);
  if (path === '/v2/projects/1314') return json(project);
  if (path === '/v2/projects/1314/project_sessions') return json(project.project_sessions);
  return notFound();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WI-0003 — cliente só de leitura da API da 42', () => {
  it('AC1: /v2/me vira um perfil tipado', async () => {
    const { client } = setup(api);
    expect(await client.me()).toEqual({
      ok: true,
      value: {
        id: USER_ID,
        login: 'pato-teste',
        imageUrl: 'https://cdn.example.test/pato-teste.jpg',
        primaryCampus: { id: 9002, name: 'Campus Sintético B' },
        piscine: { month: 'september', year: 2023 },
        isAlumni: false,
        cursus: [
          { id: 9, slug: 'c-piscine', name: 'C Piscine', level: 8.42 },
          { id: 21, slug: '42cursus', name: '42cursus', level: 5.17 },
        ],
      },
    });
  });

  it('AC1: a indicação de Alumni vem de alumni?', async () => {
    const { client } = setup((url) =>
      url.pathname === '/v2/me' ? json({ ...me, 'alumni?': true }) : notFound()
    );
    expect(await client.me()).toMatchObject({ ok: true, value: { isAlumni: true } });
  });

  it('AC2: coalitions viram uma lista tipada', async () => {
    const { client } = setup(api);
    expect(await client.coalitions(USER_ID)).toEqual({
      ok: true,
      value: [{ id: 501, name: 'Os Patos', slug: 'os-patos', color: '#00BABC' }],
    });
  });

  it('AC2: projects_users viram uma lista tipada com estado e nota final', async () => {
    const { client } = setup(api);
    expect(await client.projectsUsers(USER_ID)).toEqual({
      ok: true,
      value: [
        {
          projectId: 1301,
          name: 'Projeto 1',
          slug: 'projeto-1',
          status: 'finished',
          finalMark: 100,
          validated: true,
        },
        {
          projectId: 1302,
          name: 'Projeto 2',
          slug: 'projeto-2',
          status: 'in_progress',
          finalMark: null,
          validated: null,
        },
      ],
    });
  });

  const broken: [string, unknown][] = [
    ['sem login', { ...me, login: undefined }],
    ['login com tipo errado', { ...me, login: 42 }],
    ['campus_users com tipo errado', { ...me, campus_users: 'x' }],
    ['nível que não é número', { ...me, cursus_users: [{ ...me.cursus_users[0], level: '8.42' }] }],
    ['sem campus principal', { ...me, campus_users: [{ campus_id: 9001, is_primary: false }] }],
    ['pool_year que não é um ano', { ...me, pool_year: 'abc' }],
  ];
  it.each(broken)('AC3: /v2/me %s é rejeitado sem perfil parcial', async (_case, body) => {
    const { client } = setup((url) => (url.pathname === '/v2/me' ? json(body) : notFound()));
    const result = await client.me();
    expect(result).toMatchObject({ ok: false, error: { kind: 'invalid-response' } });
    expect(result).not.toHaveProperty('value');
  });

  it('AC3: uma coalition sem cor é rejeitada', async () => {
    const { client } = setup(() => json([{ id: 501, name: 'Os Patos', slug: 'os-patos' }]));
    expect(await client.coalitions(USER_ID)).toMatchObject({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('AC4: nunca mais de 2 pedidos por segundo nem 1200 por hora, entre clientes', async () => {
    const { client, calls, clock, limiter, fetch } = setup(api);
    // Outro utilizador, outro token, mesma aplicação: partilha o limiter.
    const other = createIntraClient({ token: 'OUTRO-TOKEN', fetch, clock, limiter });
    for (let i = 0; i < 1300; i += 1) {
      await (i % 2 === 0 ? client : other).me();
    }
    // E também em paralelo.
    await Promise.all(Array.from({ length: 10 }, () => client.me()));

    const at = calls.map((c) => c.at);
    expect(at).toHaveLength(1310);
    for (let i = 2; i < at.length; i += 1) {
      expect((at[i] ?? 0) - (at[i - 2] ?? 0)).toBeGreaterThanOrEqual(1000);
    }
    for (let i = 1200; i < at.length; i += 1) {
      expect((at[i] ?? 0) - (at[i - 1200] ?? 0)).toBeGreaterThanOrEqual(3_600_000);
    }
  });

  it('AC5: com 429 e Retry-After, espera o tempo indicado antes de repetir', async () => {
    let n = 0;
    const { client, calls } = setup((url) => {
      n += 1;
      return n === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '7' } })
        : api(url);
    });
    expect(await client.me()).toMatchObject({ ok: true });
    expect(calls).toHaveLength(2);
    expect((calls[1]?.at ?? 0) - (calls[0]?.at ?? 0)).toBeGreaterThanOrEqual(7000);
  });

  it('AC5: com 429 sem Retry-After, também espera antes de repetir', async () => {
    let n = 0;
    const { client, calls } = setup((url) => {
      n += 1;
      return n === 1 ? new Response('', { status: 429 }) : api(url);
    });
    expect(await client.me()).toMatchObject({ ok: true });
    expect(calls).toHaveLength(2);
    expect((calls[1]?.at ?? 0) - (calls[0]?.at ?? 0)).toBeGreaterThan(0);
  });

  it('AC5: ao fim de 3 repetições falha com erro de rate limit', async () => {
    const { client, calls } = setup(() => new Response('', { status: 429 }));
    expect(await client.me()).toEqual({ ok: false, error: { kind: 'rate-limited' } });
    expect(calls).toHaveLength(4); // 1 pedido + 3 repetições
  });

  it('AC6: lê todas as páginas seguindo o header Link', async () => {
    const path = `/v2/users/${String(USER_ID)}/projects_users`;
    const base = `https://api.intra.42.fr${path}`;
    const { client, calls } = setup((url) => {
      if (url.pathname !== path) return notFound();
      const page = Number(url.searchParams.get('page') ?? '1');
      const items = [projectUser(page * 10 + 1), projectUser(page * 10 + 2)];
      const link =
        page < 3
          ? `<${base}?page=${String(page + 1)}>; rel="next", <${base}?page=3>; rel="last"`
          : `<${base}?page=1>; rel="first", <${base}?page=2>; rel="prev"`;
      return json(items, { link });
    });
    const result = await client.projectsUsers(USER_ID);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok ? result.value.map((p) => p.slug) : []).toEqual([
      'projeto-11',
      'projeto-12',
      'projeto-21',
      'projeto-22',
      'projeto-31',
      'projeto-32',
    ]);
    expect(calls).toHaveLength(3);
  });

  it('AC7: o XP vem da difficulty da project_session do campus e cursus do utilizador', async () => {
    const { client } = setup(api);
    expect(await client.projectXp(1314, { campusId: 9002, cursusId: 21 })).toEqual({
      ok: true,
      value: 9450,
    });
  });

  it('AC7: sem project_session correspondente, usa a difficulty do projeto', async () => {
    const { client } = setup(api);
    expect(await client.projectXp(1314, { campusId: 9999, cursusId: 99 })).toEqual({
      ok: true,
      value: 4200,
    });
  });

  it('AC7: uma project_session só do mesmo cursus (outro campus) não conta', async () => {
    const { client } = setup(api);
    expect(await client.projectXp(1314, { campusId: 9999, cursusId: 21 })).toEqual({
      ok: true,
      value: 4200,
    });
  });

  it('AC7: a project_session correspondente com difficulty null cai para a do projeto', async () => {
    const { client } = setup((url) =>
      url.pathname.startsWith('/v2/projects/1314')
        ? json({
            ...project,
            project_sessions: [
              { id: 1, project_id: 1314, campus_id: 9002, cursus_id: 21, difficulty: null },
            ],
          })
        : notFound()
    );
    expect(await client.projectXp(1314, { campusId: 9002, cursusId: 21 })).toEqual({
      ok: true,
      value: 4200,
    });
  });

  it('AC8: só faz pedidos GET', async () => {
    let n = 0;
    const { client, calls } = setup((url) => {
      n += 1;
      return n === 1 ? new Response('', { status: 429 }) : api(url);
    });
    await client.me();
    await client.coalitions(USER_ID);
    await client.projectsUsers(USER_ID);
    await client.projectXp(1314, { campusId: 9002, cursusId: 21 });
    expect(calls.length).toBeGreaterThanOrEqual(5);
    expect(calls.map((c) => c.method)).toEqual(calls.map(() => 'GET'));
  });

  const SECRET_BODY = 'CORPO-SECRETO-91c2';
  const leaky: [string, () => Response | Promise<Response>][] = [
    ['401', () => new Response(JSON.stringify({ error: SECRET_BODY }), { status: 401 })],
    ['500', () => new Response(JSON.stringify({ message: SECRET_BODY }), { status: 500 })],
    ['corpo inválido', () => json({ ...me, login: 42, pool_month: SECRET_BODY })],
    ['JSON partido', () => new Response(`{"login": "${SECRET_BODY}"`, { status: 200 })],
    ['falha de rede', () => Promise.reject(new Error('ECONNRESET'))],
  ];
  it.each(leaky)(
    'AC9: erro (%s) sem token nem corpo da resposta, nas mensagens e nos logs',
    async (_case, respond) => {
      const logged: unknown[] = [];
      for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
        vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
          logged.push(args);
        });
      }
      const { client } = setup(respond);
      const result = await client.me();
      expect(result).toMatchObject({ ok: false });
      const everything = inspect([result, logged], { depth: null });
      expect(everything).not.toContain(TOKEN);
      expect(everything).not.toContain(SECRET_BODY);
    }
  );
});
